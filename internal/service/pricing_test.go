package service

import (
	"strings"
	"testing"
)

func moneyExt(extURL string, value int, currency string) MoneyExtension {
	return MoneyExtension{
		URL: extURL,
		ValueMoney: struct {
			Value    float64 `json:"value"`
			Currency string  `json:"currency"`
		}{Value: float64(value), Currency: currency},
	}
}

func TestFeeFromExtensions_extractsMoney(t *testing.T) {
	extensions := []MoneyExtension{
		moneyExt("https://konsulin.care/StructureDefinition/appointment-duration", 0, ""),
		moneyExt(feeExtensionURL, 350000, "IDR"),
	}
	price, err := FeeFromExtensions(extensions, feeExtensionURL)
	if err != nil {
		t.Fatalf("FeeFromExtensions returned error: %v", err)
	}
	if price.Value != 350000 || price.Currency != "IDR" {
		t.Errorf("expected 350000 IDR, got %d %s", price.Value, price.Currency)
	}
}

func TestFeeFromExtensions_missingExtension(t *testing.T) {
	_, err := FeeFromExtensions([]MoneyExtension{}, feeExtensionURL)
	if err == nil {
		t.Fatal("expected error when fee extension is missing")
	}
	if !strings.Contains(err.Error(), "fee") {
		t.Errorf("expected fee-related error message, got %v", err)
	}
}

func TestFeeFromExtensions_defaultsCurrencyToIDR(t *testing.T) {
	price, err := FeeFromExtensions([]MoneyExtension{moneyExt(feeExtensionURL, 120000, "")}, feeExtensionURL)
	if err != nil {
		t.Fatalf("FeeFromExtensions returned error: %v", err)
	}
	if price.Currency != "IDR" {
		t.Errorf("expected default IDR, got %s", price.Currency)
	}
}

func TestComposeFee_sumsAllComponents(t *testing.T) {
	price, err := ComposeFee([]PriceComponent{
		{Kind: "base-fee", Value: 150000, Currency: "IDR"},
		{Kind: "practitioner-adjustment", Value: 50000, Currency: "IDR"},
		{Kind: "system-adjustment", Value: 10000, Currency: "IDR"},
	})
	if err != nil {
		t.Fatalf("ComposeFee returned error: %v", err)
	}
	if price.Value != 210000 || price.Currency != "IDR" {
		t.Errorf("expected 210000 IDR, got %d %s", price.Value, price.Currency)
	}
}

func TestComposeFee_singleComponent(t *testing.T) {
	price, err := ComposeFee([]PriceComponent{{Kind: "base-fee", Value: 400000, Currency: "IDR"}})
	if err != nil {
		t.Fatalf("ComposeFee returned error: %v", err)
	}
	if price.Value != 400000 {
		t.Errorf("expected 400000, got %d", price.Value)
	}
}

func TestComposeFee_currencyMismatch(t *testing.T) {
	_, err := ComposeFee([]PriceComponent{
		{Kind: "base-fee", Value: 100, Currency: "IDR"},
		{Kind: "system-adjustment", Value: 10, Currency: "USD"},
	})
	if err == nil {
		t.Fatal("expected error on currency mismatch")
	}
}

func TestComposeFee_emptyComponents(t *testing.T) {
	if _, err := ComposeFee([]PriceComponent{}); err == nil {
		t.Fatal("expected error on empty components")
	}
}