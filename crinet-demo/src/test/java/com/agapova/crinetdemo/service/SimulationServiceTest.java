package com.agapova.crinetdemo.service;

import com.agapova.crinetdemo.model.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static com.agapova.crinetdemo.service.CostCalculatorTest.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SimulationServiceTest {

    private final SimulationService service = new SimulationService(new CostCalculator());

    @Test
    void emptyScenarioChangesNothing() {
        SimulationResult r = service.simulate(simpleTire("0"), MATERIALS, PARAMS, Scenario.none());
        assertThat(r.delta()).isEqualByComparingTo("0");
        assertThat(r.scenario().total()).isEqualByComparingTo(r.baseline().total());
    }

    @Test
    void materialPriceIncreaseOnlyAffectsMaterialsAndScrap() {
        // +10 % sur le caoutchouc naturel : matières 3,00 → 3,30 ; sans rebut, total +0,30
        Scenario s = new Scenario(Map.of(MaterialCategory.NATURAL_RUBBER, bd("0.10")), null, null);
        SimulationResult r = service.simulate(simpleTire("0"), MATERIALS, PARAMS, s);

        assertThat(r.scenario().materials()).isEqualByComparingTo("3.30");
        assertThat(r.scenario().labor()).isEqualByComparingTo(r.baseline().labor());
        assertThat(r.delta()).isEqualByComparingTo("0.30");
        assertThat(r.deltaPercent()).isEqualByComparingTo("1.40"); // 0,30 / 21,40
    }

    @Test
    void laborIncreaseAlsoRaisesOverhead() {
        // MO 6,00 → 6,60 ; frais 0,5 × (6,60 + 6,00) = 6,30 (+0,30) ; total +0,90
        Scenario s = new Scenario(null, null, bd("0.10"));
        SimulationResult r = service.simulate(simpleTire("0"), MATERIALS, PARAMS, s);
        assertThat(r.delta()).isEqualByComparingTo("0.90");
    }

    @Test
    void scenarioDoesNotMutateReferenceData() {
        Scenario s = new Scenario(Map.of(MaterialCategory.NATURAL_RUBBER, bd("0.50")), bd("0.50"), bd("0.50"));
        service.simulate(simpleTire("0"), MATERIALS, PARAMS, s);
        assertThat(MATERIALS.get("M1").pricePerKg()).isEqualByComparingTo("1.50");
        assertThat(PARAMS.energyPricePerKwh()).isEqualByComparingTo("0.20");
    }

    @Test
    void priceDropOfHundredPercentOrMoreIsRejected() {
        assertThatThrownBy(() -> new Scenario(null, bd("-1"), null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void sensitivityIsSortedByAmplitude() {
        List<SensitivityItem> items = service.sensitivity(simpleTire("0.1"), MATERIALS, PARAMS, bd("0.10"));
        assertThat(items).extracting(SensitivityItem::driver)
                .contains("Prix caoutchouc naturel", "Prix énergie", "Taux horaire main d'œuvre", "Coût horaire machine", "Taux de rebut");
        for (int i = 1; i < items.size(); i++) {
            BigDecimal prev = items.get(i - 1).impactHigh().subtract(items.get(i - 1).impactLow()).abs();
            BigDecimal cur = items.get(i).impactHigh().subtract(items.get(i).impactLow()).abs();
            assertThat(prev).isGreaterThanOrEqualTo(cur);
        }
        // main d'œuvre et machine (6 € chacune + frais de structure) pèsent plus que l'énergie (0,40 €)
        assertThat(items.get(0).driver()).isIn("Taux horaire main d'œuvre", "Coût horaire machine");
        assertThat(items.get(items.size() - 1).driver()).isNotIn("Taux horaire main d'œuvre", "Coût horaire machine");
    }
}
