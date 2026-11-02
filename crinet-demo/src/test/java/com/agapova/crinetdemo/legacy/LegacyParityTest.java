package com.agapova.crinetdemo.legacy;

import com.agapova.crinetdemo.data.SampleCatalog;
import com.agapova.crinetdemo.model.*;
import com.agapova.crinetdemo.service.CostCalculator;
import com.agapova.crinetdemo.service.UnknownMaterialException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Non-régression legacy → nouvelle application.
 * Les totaux diffèrent volontairement ; chaque euro d'écart doit être expliqué
 * par une divergence de règle documentée (docs/migration-legacy.md), sinon le test échoue.
 */
class LegacyParityTest {

    private static final MathContext MC = MathContext.DECIMAL64;
    /** Tolérance due aux arrondis ligne à ligne du legacy (piège P1). */
    private static final BigDecimal ROUNDING_TOLERANCE = new BigDecimal("0.05");

    private final SampleCatalog catalog = new SampleCatalog();
    private final CostCalculator calculator = new CostCalculator();

    @Test
    void everyDifferenceWithLegacyIsExplainedByDocumentedRuleChanges() {
        for (TireSpec tire : catalog.tires()) {
            LegacyCostPort.LegacyResult legacy = LegacyCostPort.coutPneu(tire, catalog.materials());
            CostBreakdown current = calculator.compute(tire, catalog.materials(), catalog.parameters());

            BigDecimal r = tire.scrapRate();
            // P2 : rebut = direct × r (legacy) au lieu de direct × r / (1 − r)
            BigDecimal scrapGap = legacy.direct().multiply(r.divide(BigDecimal.ONE.subtract(r), MC).subtract(r), MC);
            // P3 : frais de structure sur la MO seule (legacy) au lieu de MO + machine
            BigDecimal overheadGap = legacy.mach().multiply(catalog.parameters().overheadRate(), MC);

            BigDecimal unexplained = current.total().subtract(legacy.total())
                    .subtract(scrapGap).subtract(overheadGap).abs();

            assertThat(unexplained)
                    .as("écart non expliqué pour %s (legacy %s, nouveau %s)", tire.code(), legacy.total(), current.total())
                    .isLessThanOrEqualTo(ROUNDING_TOLERANCE);
        }
    }

    @Test
    void sameRulesGiveSameResultOnDirectCosts() {
        // Matières, MO, machine et énergie suivent les mêmes règles : seuls les arrondis diffèrent.
        for (TireSpec tire : catalog.tires()) {
            LegacyCostPort.LegacyResult legacy = LegacyCostPort.coutPneu(tire, catalog.materials());
            CostBreakdown current = calculator.compute(tire, catalog.materials(), catalog.parameters());
            assertThat(current.materials().subtract(legacy.mat()).abs()).isLessThanOrEqualTo(ROUNDING_TOLERANCE);
            assertThat(current.labor().subtract(legacy.mo()).abs()).isLessThanOrEqualTo(ROUNDING_TOLERANCE);
            assertThat(current.machine().subtract(legacy.mach()).abs()).isLessThanOrEqualTo(ROUNDING_TOLERANCE);
            assertThat(current.energy().subtract(legacy.ener()).abs()).isLessThanOrEqualTo(ROUNDING_TOLERANCE);
        }
    }

    @Test
    void legacyUsesBankersRoundingLikeVba() {
        // P1 : Round(0.125, 2) = 0.12 en VBA, alors que l'arrondi commercial donne 0.13
        assertThat(LegacyCostPort.vbaRound(new BigDecimal("0.125"))).isEqualByComparingTo("0.12");
        assertThat(new BigDecimal("0.125").setScale(2, RoundingMode.HALF_UP)).isEqualByComparingTo("0.13");
    }

    @Test
    void legacySilentlyIgnoresUnknownMaterialWhereasNewAppRejectsIt() {
        // P4 : On Error Resume Next → la matière manquante coûte 0 €, sans alerte
        TireSpec tire = new TireSpec("BUG", "Matière manquante", "-",
                List.of(new BomLine("NR", new BigDecimal("1")), new BomLine("INCONNUE", new BigDecimal("5"))),
                catalog.tire("TC-205").steps(), new BigDecimal("0.02"));
        Map<String, Material> materials = catalog.materials();

        LegacyCostPort.LegacyResult legacy = LegacyCostPort.coutPneu(tire, materials);
        assertThat(legacy.mat()).isEqualByComparingTo("1.75"); // seul NR est compté

        assertThatThrownBy(() -> calculator.compute(tire, materials, catalog.parameters()))
                .isInstanceOf(UnknownMaterialException.class);
    }
}
