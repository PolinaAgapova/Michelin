package com.agapova.crinetdemo.data;

import com.agapova.crinetdemo.model.*;
import com.agapova.crinetdemo.service.TireNotFoundException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.*;

/**
 * Catalogue en mémoire.
 * ⚠ Toutes les valeurs sont FICTIVES, choisies uniquement pour être plausibles
 * dans un contexte pédagogique. Elles ne proviennent d'aucune entreprise.
 */
@Component
public class SampleCatalog {

    private final Map<String, Material> materials = new LinkedHashMap<>();
    private final Map<String, TireSpec> tires = new LinkedHashMap<>();
    private final CostParameters parameters = new CostParameters(bd("0.18"), bd("0.35"));

    public SampleCatalog() {
        add(new Material("NR", "Caoutchouc naturel", MaterialCategory.NATURAL_RUBBER, bd("1.75")));
        add(new Material("SBR", "Caoutchouc synthétique SBR", MaterialCategory.SYNTHETIC_RUBBER, bd("2.10")));
        add(new Material("CB", "Noir de carbone", MaterialCategory.FILLER, bd("1.30")));
        add(new Material("SIL", "Silice", MaterialCategory.FILLER, bd("1.60")));
        add(new Material("STL", "Câble acier", MaterialCategory.STEEL, bd("1.95")));
        add(new Material("PA", "Textile polyamide", MaterialCategory.TEXTILE, bd("4.20")));
        add(new Material("CHM", "Produits chimiques (soufre, accélérateurs...)", MaterialCategory.CHEMICALS, bd("3.50")));

        tires.put("TC-205", new TireSpec("TC-205", "Tourisme été (exemple)", "205/55 R16",
                List.of(line("NR", "1.90"), line("SBR", "2.30"), line("CB", "1.70"), line("SIL", "0.90"),
                        line("STL", "1.20"), line("PA", "0.45"), line("CHM", "0.35")),
                standardSteps("1.0"), bd("0.025")));

        tires.put("SUV-235", new TireSpec("SUV-235", "SUV toutes saisons (exemple)", "235/60 R18",
                List.of(line("NR", "2.60"), line("SBR", "3.00"), line("CB", "2.20"), line("SIL", "1.30"),
                        line("STL", "1.60"), line("PA", "0.60"), line("CHM", "0.45")),
                standardSteps("1.3"), bd("0.03")));

        tires.put("PL-315", new TireSpec("PL-315", "Poids lourd (exemple)", "315/80 R22.5",
                List.of(line("NR", "20.0"), line("SBR", "6.0"), line("CB", "11.0"), line("STL", "14.0"),
                        line("PA", "0.8"), line("CHM", "2.2")),
                standardSteps("4.5"), bd("0.02")));
    }

    private static List<ProcessStep> standardSteps(String sizeFactor) {
        BigDecimal f = bd(sizeFactor);
        return List.of(
                step("Mélangeage", "0.8", "60", "38", "0.5", "2.4", f),
                step("Calandrage / extrusion", "1.2", "50", "38", "1", "1.6", f),
                step("Assemblage", "2.5", "40", "38", "1", "0.9", f),
                step("Cuisson", "11.0", "25", "38", "0.2", "3.8", f),
                step("Contrôle final", "1.0", "20", "38", "1", "0.2", f));
    }

    private static ProcessStep step(String name, String cycle, String machine, String labor,
                                    String ops, String kwh, BigDecimal f) {
        return new ProcessStep(name, bd(cycle).multiply(f), bd(machine), bd(labor), bd(ops), bd(kwh).multiply(f));
    }

    private static BomLine line(String code, String kg) {
        return new BomLine(code, bd(kg));
    }

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    private void add(Material m) {
        materials.put(m.code(), m);
    }

    public Map<String, Material> materials() {
        return Collections.unmodifiableMap(materials);
    }

    public Collection<TireSpec> tires() {
        return Collections.unmodifiableCollection(tires.values());
    }

    public TireSpec tire(String code) {
        TireSpec t = tires.get(code);
        if (t == null) {
            throw new TireNotFoundException(code);
        }
        return t;
    }

    public CostParameters parameters() {
        return parameters;
    }
}
