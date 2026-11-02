package com.agapova.crinetdemo.service;

import com.agapova.crinetdemo.model.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CostCalculatorTest {

    private final CostCalculator calculator = new CostCalculator();

    static final Map<String, Material> MATERIALS = Map.of(
            "M1", new Material("M1", "Matière test", MaterialCategory.NATURAL_RUBBER, bd("1.50")));

    /** Pneu minimal dont le coût est calculé à la main (voir docs/user-stories.md, US-01). */
    static TireSpec simpleTire(String scrapRate) {
        return new TireSpec("T1", "Test", "100/00 R10",
                List.of(new BomLine("M1", bd("2"))),
                List.of(new ProcessStep("Étape", bd("6"), bd("60"), bd("30"), bd("2"), bd("2"))),
                bd(scrapRate));
    }

    static final CostParameters PARAMS = new CostParameters(bd("0.20"), bd("0.50"));

    @Test
    void computesEachCostComponentAsInTheHandCalculation() {
        // matières 2 × 1,50 = 3,00 ; 6 min = 0,1 h
        // MO 0,1 × 30 × 2 = 6,00 ; machine 0,1 × 60 = 6,00 ; énergie 2 × 0,20 = 0,40
        // direct = 15,40 ; rebut 15,40 × 0,2 / 0,8 = 3,85 ; frais 0,5 × 12 = 6,00 ; total 25,25
        CostBreakdown b = calculator.compute(simpleTire("0.2"), MATERIALS, PARAMS);

        assertThat(b.materials()).isEqualByComparingTo("3.00");
        assertThat(b.labor()).isEqualByComparingTo("6.00");
        assertThat(b.machine()).isEqualByComparingTo("6.00");
        assertThat(b.energy()).isEqualByComparingTo("0.40");
        assertThat(b.scrap()).isEqualByComparingTo("3.85");
        assertThat(b.overhead()).isEqualByComparingTo("6.00");
        assertThat(b.total()).isEqualByComparingTo("25.25");
    }

    @Test
    void noScrapMeansNoScrapCost() {
        CostBreakdown b = calculator.compute(simpleTire("0"), MATERIALS, PARAMS);
        assertThat(b.scrap()).isEqualByComparingTo("0");
        assertThat(b.total()).isEqualByComparingTo("21.40");
    }

    @Test
    void exposesDetailLinesForTraceability() {
        CostBreakdown b = calculator.compute(simpleTire("0"), MATERIALS, PARAMS);
        assertThat(b.materialLines()).singleElement()
                .satisfies(l -> assertThat(l.cost()).isEqualByComparingTo("3.00"));
        assertThat(b.stepLines()).singleElement()
                .satisfies(l -> assertThat(l.labor()).isEqualByComparingTo("6.00"));
    }

    @Test
    void unknownMaterialIsRejected() {
        TireSpec tire = new TireSpec("T2", "Test", "-",
                List.of(new BomLine("NOPE", bd("1"))),
                simpleTire("0").steps(), bd("0"));
        assertThatThrownBy(() -> calculator.compute(tire, MATERIALS, PARAMS))
                .isInstanceOf(UnknownMaterialException.class);
    }

    @Test
    void invalidScrapRateIsRejectedAtConstruction() {
        assertThatThrownBy(() -> simpleTire("0.5")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> simpleTire("-0.1")).isInstanceOf(IllegalArgumentException.class);
    }

    static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }
}
