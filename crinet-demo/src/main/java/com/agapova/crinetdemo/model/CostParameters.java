package com.agapova.crinetdemo.model;

import java.math.BigDecimal;

/**
 * Paramètres économiques globaux.
 *
 * @param energyPricePerKwh prix de l'énergie, €/kWh
 * @param overheadRate      frais de structure, appliqués à (main d'œuvre + machine)
 */
public record CostParameters(BigDecimal energyPricePerKwh, BigDecimal overheadRate) {
    public CostParameters {
        Validation.requireNonNegative(energyPricePerKwh, "energyPricePerKwh");
        Validation.requireNonNegative(overheadRate, "overheadRate");
    }
}
