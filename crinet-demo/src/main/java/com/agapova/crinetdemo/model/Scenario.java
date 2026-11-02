package com.agapova.crinetdemo.model;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Scénario "what-if" : variations relatives (ex. 0.10 = +10 %) appliquées aux prix.
 */
public record Scenario(Map<MaterialCategory, BigDecimal> materialPriceChange,
                       BigDecimal energyPriceChange,
                       BigDecimal laborRateChange) {
    public Scenario {
        materialPriceChange = materialPriceChange == null ? Map.of() : Map.copyOf(materialPriceChange);
        energyPriceChange = energyPriceChange == null ? BigDecimal.ZERO : energyPriceChange;
        laborRateChange = laborRateChange == null ? BigDecimal.ZERO : laborRateChange;
        BigDecimal minusOne = BigDecimal.ONE.negate();
        materialPriceChange.forEach((k, v) -> {
            if (v.compareTo(minusOne) <= 0) {
                throw new IllegalArgumentException("price change for " + k + " must be > -100%");
            }
        });
        if (energyPriceChange.compareTo(minusOne) <= 0 || laborRateChange.compareTo(minusOne) <= 0) {
            throw new IllegalArgumentException("changes must be > -100%");
        }
    }

    public static Scenario none() {
        return new Scenario(Map.of(), BigDecimal.ZERO, BigDecimal.ZERO);
    }
}
