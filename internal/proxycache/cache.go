// Package proxycache provides an in-memory, size-bounded TTL cache for
// proxied FHIR GET responses with single-flight loading per key.
package proxycache

import (
	"sync"
	"time"
)

// Entry is one cached proxy response.
type Entry struct {
	Status int

	ContentType string

	Body []byte

	StoredAt time.Time
}

// Options configures a Cache. Zero or negative limits disable the matching
// bound; a nil Now falls back to time.Now. TTL zero or below disables expiry.
type Options struct {
	TTL time.Duration

	MaxEntries int

	MaxEntryBytes int

	MaxTotalBytes int

	Now func() time.Time
}

type record struct {
	entry Entry

	resourceType string
}

type call struct {
	done chan struct{}

	entry Entry

	cached bool

	err error
}

// Cache is a mutex-guarded TTL cache tracking total stored bytes.
type Cache struct {
	mu sync.Mutex

	opts Options

	now func() time.Time

	entries map[string]*record

	order []string

	totalBytes int

	inflight map[string]*call
}

// New creates an empty cache using the supplied options.
func New(opts Options) *Cache {
	now := opts.Now
	if now == nil {
		now = time.Now
	}
	return &Cache{
		opts:     opts,
		now:      now,
		entries:  make(map[string]*record),
		inflight: make(map[string]*call),
	}
}

// Get returns the cached entry for key. An expired entry is evicted and
// reported as a miss.
func (c *Cache) Get(key string) (Entry, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.getLocked(key)
}

// Set stores an entry under key and resourceType, skipping bodies larger than
// MaxEntryBytes and evicting the oldest-inserted entries until the entry count
// and total byte limits hold.
func (c *Cache) Set(key, resourceType string, e Entry) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.setLocked(key, resourceType, e)
}

// Do serves key from cache when possible. Concurrent callers for the same key
// share one load; the entry is stored only when cacheable and err is nil. The
// returned hit is true when the entry came from the cache rather than the load.
func (c *Cache) Do(key string, load func() (Entry, string, bool, error)) (Entry, bool, error) {
	c.mu.Lock()
	if e, ok := c.getLocked(key); ok {
		c.mu.Unlock()
		return e, true, nil
	}
	if cl, ok := c.inflight[key]; ok {
		c.mu.Unlock()
		<-cl.done
		return cl.entry, cl.cached, cl.err
	}
	cl := &call{done: make(chan struct{})}
	c.inflight[key] = cl
	c.mu.Unlock()

	entry, resourceType, cacheable, err := load()
	if entry.StoredAt.IsZero() {
		entry.StoredAt = c.now()
	}

	c.mu.Lock()
	delete(c.inflight, key)
	if err == nil && cacheable {
		c.setLocked(key, resourceType, entry)
		cl.cached = true
	}
	cl.entry = entry
	cl.err = err
	c.mu.Unlock()
	close(cl.done)

	return entry, false, err
}

// InvalidateType removes every entry recorded under resourceType; "*" clears
// the whole cache.
func (c *Cache) InvalidateType(resourceType string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for key, rec := range c.entries {
		if resourceType == "*" || rec.resourceType == resourceType {
			c.removeLocked(key)
		}
	}
}

func (c *Cache) getLocked(key string) (Entry, bool) {
	rec, ok := c.entries[key]
	if !ok {
		return Entry{}, false
	}
	if c.expired(rec.entry) {
		c.removeLocked(key)
		return Entry{}, false
	}
	return rec.entry, true
}

func (c *Cache) setLocked(key, resourceType string, e Entry) {
	if c.opts.MaxEntryBytes > 0 && len(e.Body) > c.opts.MaxEntryBytes {
		return
	}
	if existing, ok := c.entries[key]; ok {
		c.totalBytes -= len(existing.entry.Body)
		delete(c.entries, key)
		c.removeFromOrder(key)
	}
	c.entries[key] = &record{entry: e, resourceType: resourceType}
	c.order = append(c.order, key)
	c.totalBytes += len(e.Body)
	c.evictLocked()
}

func (c *Cache) evictLocked() {
	for len(c.order) > 0 {
		overEntries := c.opts.MaxEntries > 0 && len(c.order) > c.opts.MaxEntries
		overBytes := c.opts.MaxTotalBytes > 0 && c.totalBytes > c.opts.MaxTotalBytes
		if !overEntries && !overBytes {
			return
		}
		c.removeLocked(c.order[0])
	}
}

func (c *Cache) removeLocked(key string) {
	rec, ok := c.entries[key]
	if !ok {
		return
	}
	c.totalBytes -= len(rec.entry.Body)
	delete(c.entries, key)
	c.removeFromOrder(key)
}

func (c *Cache) removeFromOrder(key string) {
	for i, k := range c.order {
		if k == key {
			c.order = append(c.order[:i], c.order[i+1:]...)
			return
		}
	}
}

func (c *Cache) expired(e Entry) bool {
	if c.opts.TTL <= 0 {
		return false
	}
	return c.now().Sub(e.StoredAt) >= c.opts.TTL
}
