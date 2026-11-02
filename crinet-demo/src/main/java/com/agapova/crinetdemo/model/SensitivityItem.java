package com.agapova.crinetdemo.model;

import java.math.BigDecimal;

/** Impact sur le coût total d'une variation de ±X % d'un inducteur de coût. */
public record SensitivityItem(String driver, BigDecimal impactLow, BigDecimal impactHigh) {
}
