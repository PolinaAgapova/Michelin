package com.agapova.crinetdemo.legacy;

import com.agapova.crinetdemo.model.BomLine;
import com.agapova.crinetdemo.model.Material;
import com.agapova.crinetdemo.model.ProcessStep;
import com.agapova.crinetdemo.model.TireSpec;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.Map;

/**
 * Portage volontairement FIDÈLE de legacy/CalculCoutPneu.bas, défauts compris.
 * Sert d'oracle pour les tests de non-régression : il ne doit pas être "corrigé".
 */
public final class LegacyCostPort {

    static final BigDecimal PRIX_KWH = new BigDecimal("0.18");
    static final BigDecimal TX_FRAIS = new BigDecimal("0.35");
    private static final MathContext MC = MathContext.DECIMAL64;
    private static final BigDecimal SIXTY = BigDecimal.valueOf(60);

    /** Détail des postes calculés par la macro, pour expliquer les écarts. */
    public record LegacyResult(BigDecimal mat, BigDecimal mo, BigDecimal mach, BigDecimal ener,
                               BigDecimal rebut, BigDecimal frais, BigDecimal total) {
        public BigDecimal direct() {
            return mat.add(mo).add(mach).add(ener);
        }
    }

    private LegacyCostPort() {
    }

    /** VBA Round() = arrondi bancaire (au pair le plus proche), pas l'arrondi commercial. */
    static BigDecimal vbaRound(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_EVEN);
    }

    /** On Error Resume Next : une matière introuvable vaut 0 € sans aucun message. */
    static BigDecimal prixMatiere(Map<String, Material> materials, String code) {
        Material m = materials.get(code);
        return m == null ? BigDecimal.ZERO : m.pricePerKg();
    }

    public static LegacyResult coutPneu(TireSpec tire, Map<String, Material> materials) {
        BigDecimal mat = BigDecimal.ZERO;
        for (BomLine l : tire.bom()) {
            mat = mat.add(vbaRound(l.kgPerTire().multiply(prixMatiere(materials, l.materialCode()), MC)));
        }
        BigDecimal mo = BigDecimal.ZERO, mach = BigDecimal.ZERO, ener = BigDecimal.ZERO;
        for (ProcessStep s : tire.steps()) {
            BigDecimal h = s.cycleTimeMin().divide(SIXTY, MC);
            mo = mo.add(vbaRound(h.multiply(s.laborRatePerHour(), MC).multiply(s.operators(), MC)));
            mach = mach.add(vbaRound(h.multiply(s.machineRatePerHour(), MC)));
            ener = ener.add(vbaRound(s.energyKwh().multiply(PRIX_KWH, MC)));
        }
        BigDecimal direct = mat.add(mo).add(mach).add(ener);
        BigDecimal rebut = vbaRound(direct.multiply(tire.scrapRate(), MC));
        BigDecimal frais = vbaRound(mo.multiply(TX_FRAIS, MC));
        return new LegacyResult(mat, mo, mach, ener, rebut, frais, vbaRound(direct.add(rebut).add(frais)));
    }
}
