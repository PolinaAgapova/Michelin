package com.agapova.crinetdemo.service;

import com.agapova.crinetdemo.model.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Simulation "what-if" et analyse de sensibilité, sans modifier les données de référence. */
@Service
public class SimulationService {

    private static final MathContext MC = MathContext.DECIMAL64;
    private final CostCalculator calculator;

    public SimulationService(CostCalculator calculator) {
        this.calculator = calculator;
    }

    public SimulationResult simulate(TireSpec tire, Map<String, Material> materials,
                                     CostParameters params, Scenario scenario) {
        CostBreakdown base = calculator.compute(tire, materials, params);
        CostBreakdown sim = calculator.compute(applyLabor(tire, scenario.laborRateChange()),
                applyMaterials(materials, scenario.materialPriceChange()),
                applyEnergy(params, scenario.energyPriceChange()));
        BigDecimal delta = sim.total().subtract(base.total());
        BigDecimal pct = base.total().signum() == 0 ? BigDecimal.ZERO
                : delta.multiply(BigDecimal.valueOf(100)).divide(base.total(), 2, RoundingMode.HALF_UP);
        return new SimulationResult(base, sim, delta, pct);
    }

    /**
     * Pour chaque inducteur (chaque famille de matière, énergie, main d'œuvre, rebut),
     * calcule l'écart de coût total pour une variation de −variation / +variation.
     * Résultat trié par amplitude décroissante (diagramme "tornado").
     */
    public List<SensitivityItem> sensitivity(TireSpec tire, Map<String, Material> materials,
                                             CostParameters params, BigDecimal variation) {
        BigDecimal base = calculator.compute(tire, materials, params).total();
        BigDecimal low = variation.negate();
        List<SensitivityItem> items = new ArrayList<>();

        tire.bom().stream()
                .map(l -> materials.get(l.materialCode()))
                .filter(m -> m != null)
                .map(Material::category)
                .distinct()
                .forEach(cat -> items.add(new SensitivityItem("Prix " + cat.label(),
                        impact(base, tire, applyMaterials(materials, Map.of(cat, low)), params),
                        impact(base, tire, applyMaterials(materials, Map.of(cat, variation)), params))));

        items.add(new SensitivityItem("Prix énergie",
                impact(base, tire, materials, applyEnergy(params, low)),
                impact(base, tire, materials, applyEnergy(params, variation))));
        items.add(new SensitivityItem("Taux horaire main d'œuvre",
                impact(base, applyLabor(tire, low), materials, params),
                impact(base, applyLabor(tire, variation), materials, params)));
        items.add(new SensitivityItem("Coût horaire machine",
                impact(base, applyMachine(tire, low), materials, params),
                impact(base, applyMachine(tire, variation), materials, params)));
        items.add(new SensitivityItem("Taux de rebut",
                impact(base, applyScrap(tire, low), materials, params),
                impact(base, applyScrap(tire, variation), materials, params)));

        items.sort((a, b) -> amplitude(b).compareTo(amplitude(a)));
        return items;
    }

    private BigDecimal impact(BigDecimal base, TireSpec t, Map<String, Material> m, CostParameters p) {
        return calculator.compute(t, m, p).total().subtract(base);
    }

    private static BigDecimal amplitude(SensitivityItem i) {
        return i.impactHigh().subtract(i.impactLow()).abs();
    }

    private static BigDecimal factor(BigDecimal change) {
        return BigDecimal.ONE.add(change);
    }

    static Map<String, Material> applyMaterials(Map<String, Material> materials,
                                                Map<MaterialCategory, BigDecimal> changes) {
        Map<String, Material> out = new LinkedHashMap<>();
        materials.forEach((code, m) -> {
            BigDecimal change = changes.getOrDefault(m.category(), BigDecimal.ZERO);
            out.put(code, new Material(m.code(), m.label(), m.category(),
                    m.pricePerKg().multiply(factor(change), MC)));
        });
        return out;
    }

    static CostParameters applyEnergy(CostParameters p, BigDecimal change) {
        return new CostParameters(p.energyPricePerKwh().multiply(factor(change), MC), p.overheadRate());
    }

    static TireSpec applyLabor(TireSpec t, BigDecimal change) {
        List<ProcessStep> steps = t.steps().stream()
                .map(s -> new ProcessStep(s.name(), s.cycleTimeMin(), s.machineRatePerHour(),
                        s.laborRatePerHour().multiply(factor(change), MC), s.operators(), s.energyKwh()))
                .toList();
        return new TireSpec(t.code(), t.label(), t.dimension(), t.bom(), steps, t.scrapRate());
    }

    static TireSpec applyMachine(TireSpec t, BigDecimal change) {
        List<ProcessStep> steps = t.steps().stream()
                .map(s -> new ProcessStep(s.name(), s.cycleTimeMin(),
                        s.machineRatePerHour().multiply(factor(change), MC),
                        s.laborRatePerHour(), s.operators(), s.energyKwh()))
                .toList();
        return new TireSpec(t.code(), t.label(), t.dimension(), t.bom(), steps, t.scrapRate());
    }

    static TireSpec applyScrap(TireSpec t, BigDecimal change) {
        return new TireSpec(t.code(), t.label(), t.dimension(), t.bom(), t.steps(),
                t.scrapRate().multiply(factor(change), MC));
    }
}
