package service

import (
	"errors"
	"fmt"
)

// Price is a monetary amount with a currency code.
type Price struct {
	Value    int    `json:"value"`
	Currency string `json:"currency"`
}

// moneyValue mirrors FHIR Money.
type moneyValue struct {
	Value    float64 `json:"value"`
	Currency string  `json:"currency"`
}

// MoneyExtension is a FHIR extension that may carry valueMoney or valueDuration.
type MoneyExtension struct {
	URL           string     `json:"url"`
	ValueMoney    moneyValue `json:"valueMoney"`
	ValueDuration struct {
		Value int `json:"value"`
	} `json:"valueDuration"`
}

// PriceComponent is one ADR-007 fee component: base fee, practitioner
// adjustment, or system adjustment.
type PriceComponent struct {
	Kind     string `json:"kind"`
	Value    int    `json:"value"`
	Currency string `json:"currency"`
}

// FeeFromExtensions extracts the money from the extension matching extURL.
// Currency defaults to IDR when absent.
func FeeFromExtensions(extensions []MoneyExtension, extURL string) (Price, error) {
	for _, ext := range extensions {
		if ext.URL != extURL {
			continue
		}
		currency := ext.ValueMoney.Currency
		if currency == "" {
			currency = "IDR"
		}
		return Price{Value: int(ext.ValueMoney.Value), Currency: currency}, nil
	}
	return Price{}, fmt.Errorf("fee extension %s not found", extURL)
}

// ComposeFee sums the ADR-007 pricing components into a final price:
// final = base_fee + practitioner_adjustment + system_adjustment.
func ComposeFee(components []PriceComponent) (Price, error) {
	if len(components) == 0 {
		return Price{}, errors.New("no price components")
	}
	currency := components[0].Currency
	if currency == "" {
		currency = "IDR"
	}
	sum := 0
	for _, c := range components {
		if c.Currency != "" && c.Currency != currency {
			return Price{}, fmt.Errorf("currency mismatch: %s vs %s", c.Currency, currency)
		}
		sum += c.Value
	}
	return Price{Value: sum, Currency: currency}, nil
}
