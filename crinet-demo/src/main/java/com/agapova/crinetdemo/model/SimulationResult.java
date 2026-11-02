package com.agapova.crinetdemo.model;

import java.math.BigDecimal;

public record SimulationResult(CostBreakdown baseline, CostBreakdown scenario,
                               BigDecimal delta, BigDecimal deltaPercent) {
}
