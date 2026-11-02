package com.agapova.crinetdemo.model;

import java.math.BigDecimal;

/**
 * Étape de fabrication (mélangeage, calandrage, assemblage, cuisson...).
 *
 * @param cycleTimeMin       temps de cycle par pneu, en minutes
 * @param machineRatePerHour coût horaire machine (amortissement + maintenance), €/h
 * @param laborRatePerHour   coût horaire chargé d'un opérateur, €/h
 * @param operators          nombre d'opérateurs affectés à l'étape
 * @param energyKwh          énergie consommée par pneu, kWh
 */
public record ProcessStep(String name,
                          BigDecimal cycleTimeMin,
                          BigDecimal machineRatePerHour,
                          BigDecimal laborRatePerHour,
                          BigDecimal operators,
                          BigDecimal energyKwh) {
    public ProcessStep {
        Validation.requireText(name, "name");
        Validation.requirePositive(cycleTimeMin, "cycleTimeMin");
        Validation.requireNonNegative(machineRatePerHour, "machineRatePerHour");
        Validation.requireNonNegative(laborRatePerHour, "laborRatePerHour");
        Validation.requireNonNegative(operators, "operators");
        Validation.requireNonNegative(energyKwh, "energyKwh");
    }
}
