package com.agapova.crinetdemo.web;

import com.agapova.crinetdemo.data.SampleCatalog;
import com.agapova.crinetdemo.model.*;
import com.agapova.crinetdemo.service.CostCalculator;
import com.agapova.crinetdemo.service.SimulationService;
import com.agapova.crinetdemo.service.TireNotFoundException;
import com.agapova.crinetdemo.service.UnknownMaterialException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/api")
public class TireController {

    private final SampleCatalog catalog;
    private final CostCalculator calculator;
    private final SimulationService simulation;

    public TireController(SampleCatalog catalog, CostCalculator calculator, SimulationService simulation) {
        this.catalog = catalog;
        this.calculator = calculator;
        this.simulation = simulation;
    }

    @GetMapping("/tires")
    public Collection<TireSpec> tires() {
        return catalog.tires();
    }

    @GetMapping("/materials")
    public Collection<Material> materials() {
        return catalog.materials().values();
    }

    @GetMapping("/tires/{code}/cost")
    public CostBreakdown cost(@PathVariable String code) {
        return calculator.compute(catalog.tire(code), catalog.materials(), catalog.parameters());
    }

    @PostMapping("/tires/{code}/simulate")
    public SimulationResult simulate(@PathVariable String code, @RequestBody Scenario scenario) {
        return simulation.simulate(catalog.tire(code), catalog.materials(), catalog.parameters(), scenario);
    }

    @GetMapping("/tires/{code}/sensitivity")
    public List<SensitivityItem> sensitivity(@PathVariable String code,
                                             @RequestParam(defaultValue = "0.10") BigDecimal variation) {
        if (variation.signum() <= 0 || variation.compareTo(BigDecimal.ONE) >= 0) {
            throw new IllegalArgumentException("variation must be in ]0, 1[");
        }
        return simulation.sensitivity(catalog.tire(code), catalog.materials(), catalog.parameters(), variation);
    }

    @ExceptionHandler(TireNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ProblemDetail notFound(TireNotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, UnknownMaterialException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail badRequest(RuntimeException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }
}
