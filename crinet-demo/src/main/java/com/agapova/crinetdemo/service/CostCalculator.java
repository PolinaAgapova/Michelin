package com.agapova.crinetdemo.service;

import com.agapova.crinetdemo.model.*;
import com.agapova.crinetdemo.model.CostBreakdown.MaterialCostLine;
import com.agapova.crinetdemo.model.CostBreakdown.StepCostLine;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Règles de calcul du coût industriel d'un pneu.
 *
 * <ul>
 *   <li>Matières = Σ kg × prix €/kg</li>
 *   <li>Main d'œuvre (par étape) = temps de cycle (h) × taux horaire × nb opérateurs</li>
 *   <li>Machine (par étape) = temps de cycle (h) × coût horaire machine</li>
 *   <li>Énergie = Σ kWh × prix énergie</li>
 *   <li>Rebut = coût direct × r / (1 − r) : les pneus rebutés sont portés par les pneus bons</li>
 *   <li>Frais de structure = taux × (main d'œuvre + machine)</li>
 * </ul>
 * Les montants sont arrondis à 2 décimales uniquement en sortie.
 */
@Service
public class CostCalculator {

    private static final MathContext MC = MathContext.DECIMAL64;
    private static final BigDecimal SIXTY = BigDecimal.valueOf(60);

    public CostBreakdown compute(TireSpec tire, Map<String, Material> materials, CostParameters params) {
        BigDecimal materialTotal = BigDecimal.ZERO;
        List<MaterialCostLine> materialLines = new ArrayList<>();
        for (BomLine line : tire.bom()) {
            Material m = materials.get(line.materialCode());
            if (m == null) {
                throw new UnknownMaterialException(line.materialCode());
            }
            BigDecimal cost = line.kgPerTire().multiply(m.pricePerKg(), MC);
            materialTotal = materialTotal.add(cost, MC);
            materialLines.add(new MaterialCostLine(m.code(), m.label(), m.category(),
                    line.kgPerTire(), m.pricePerKg(), round(cost)));
        }

        BigDecimal labor = BigDecimal.ZERO;
        BigDecimal machine = BigDecimal.ZERO;
        BigDecimal energy = BigDecimal.ZERO;
        List<StepCostLine> stepLines = new ArrayList<>();
        for (ProcessStep step : tire.steps()) {
            BigDecimal hours = step.cycleTimeMin().divide(SIXTY, MC);
            BigDecimal stepLabor = hours.multiply(step.laborRatePerHour(), MC).multiply(step.operators(), MC);
            BigDecimal stepMachine = hours.multiply(step.machineRatePerHour(), MC);
            BigDecimal stepEnergy = step.energyKwh().multiply(params.energyPricePerKwh(), MC);
            labor = labor.add(stepLabor, MC);
            machine = machine.add(stepMachine, MC);
            energy = energy.add(stepEnergy, MC);
            stepLines.add(new StepCostLine(step.name(), round(stepLabor), round(stepMachine), round(stepEnergy)));
        }

        BigDecimal direct = materialTotal.add(labor, MC).add(machine, MC).add(energy, MC);
        BigDecimal r = tire.scrapRate();
        BigDecimal scrap = direct.multiply(r, MC).divide(BigDecimal.ONE.subtract(r), MC);
        BigDecimal overhead = labor.add(machine, MC).multiply(params.overheadRate(), MC);
        BigDecimal total = direct.add(scrap, MC).add(overhead, MC);

        return new CostBreakdown(tire.code(), round(materialTotal), round(labor), round(machine),
                round(energy), round(scrap), round(overhead), round(total),
                List.copyOf(materialLines), List.copyOf(stepLines));
    }

    static BigDecimal round(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
