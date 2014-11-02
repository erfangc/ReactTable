/** @jsx React.DOM */

function buildLAFConfigObject(columnDef) {
    var formatInstructions = columnDef.formatInstructions;
    "use strict";
    var result = {
        multiplier: 1,
        roundTo: 2,
        unit: null,
        alignment: getColumnAlignment(columnDef)
    };
    if (!formatInstructions)
        return result;
    var tokens = formatInstructions.split(/\s+/);
    for (var i = 0; i < tokens.length; i++) {
        var key = tokens[i].split(":", 2)[0];
        result[key] = tokens[i].split(":", 2)[1];
    }
    return result;
}

/**
 * Determines the style, classes and text formatting of cell content
 * given a column configuartion object and a row of data
 *
 * @param columnDef
 * @param row
 * @returns { classes: {}, style: {}, value: {}}
 */
function buildCellLookAndFeel(columnDef, row) {
    "use strict";
    var results = {classes: {}, styles: {}, value: {}};
    var value = row[columnDef.colTag];

    columnDef.formatConfig = columnDef.formatConfig || buildLAFConfigObject(columnDef);
    var formatConfig = columnDef.formatConfig;

    // invoke cell class callback
    if (columnDef.cellClassCallback)
        results.classes = columnDef.cellClassCallback(row);

    value = formatNumber(value, columnDef, formatConfig);

    // unit
    if (formatConfig.unit)
        value = value + " " + formatConfig.unit;

    // attach currency
    if (columnDef.format == "currency")
        value = "$" + value;

    // determine alignment
    results.styles.textAlign = formatConfig.alignment;
    results.styles.width = columnDef.text.length + "em";
    results.value = value;

    return results;
}

function getColumnAlignment(columnDef) {
    "use strict";
    return (columnDef.format == "number" || columnDef.format == "currency") ? "right" : "left"
}

function formatNumber(value, columnDef, formatConfig) {
    if (!isNaN(value) && (columnDef.format == "number" || columnDef.format == "currency")) {
        // multiplier
        value *= formatConfig.multiplier;
        // rounding
        value = value.toFixed(formatConfig.roundTo);
    }
    return value;
}