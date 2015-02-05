/**
 * find the right sector name for the current row for the given level of row grouping
 * this method can take partition groupBy columns that are numeric in nature and bucket rows based on where they fall
 * in the partition
 * @param groupBy the column to group groupBy
 * @param row the data row to determine the sector name for
 */
function getSectorName(row, groupBy) {
    var sectorName = "", sortIndex = null;
    if (groupBy.format == "number" || groupBy.format == "currency") {
        var result = _resolveNumericSectorName(groupBy, row);
        sectorName = result.sectorName;
        sortIndex = result.sortIndex;
    } else
        sectorName = row[groupBy.colTag];
    return {sectorName: sectorName || "Other", sortIndex: sortIndex};
}

function aggregateSector(bucketResult, columnDefs, groupBy) {
    var result = {};
    for (var i = 1; i < columnDefs.length; i++)
        result[columnDefs[i].colTag] = _aggregateColumn(bucketResult, columnDefs[i], groupBy);
    return result;
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _resolveNumericSectorName(groupBy, row) {
    var sectorName = "", sortIndex = "";
    if (groupBy.groupByRange) {
        for (var i = 0; i < groupBy.groupByRange.length; i++) {
            if (row[groupBy.colTag] < groupBy.groupByRange[i]) {
                sectorName = groupBy.text + " " + (i != 0 ? groupBy.groupByRange[i - 1] : 0) + " - " + groupBy.groupByRange[i];
                sortIndex = i;
                break;
            }
        }
        if (!sectorName) {
            sectorName = groupBy.text + " " + groupBy.groupByRange[groupBy.groupByRange.length - 1] + "+";
            sortIndex = i + 1;
        }
    }
    else
        sectorName = groupBy.text;
    return {sectorName: sectorName, sortIndex: sortIndex};
}

/**
 * solves for the correct aggregation method given the current columnDef being aggregated
 * and table settings. sophisticated aggregation methods (such as conditional aggregation) can be determined here
 *
 * conditional aggregation is the ability to switch up aggregation method based on the columnDef used in group by
 * the columnDef property `conditionalAggregationMethod` takes the an object {key:value, key2: value2} where `key(s)`
 * are the colTag and `value{s}` is the corresponding aggregation method to use when table groupBy is set to the colTag specified in the key
 *
 * @param columnDef
 * @param groupBy
 */
function _resolveAggregationMethod(columnDef, groupBy) {
    var result = "";
    if (columnDef.aggregationMethod) {
        result = columnDef.aggregationMethod;
    }
    // resolve conditional aggregation method
    if (columnDef.conditionalAggregationMethod && groupBy && groupBy.length == 1) {
        var groupByColTag = groupBy[0].colTag;
        if (columnDef.conditionalAggregationMethod[groupByColTag])
            result = columnDef.conditionalAggregationMethod[groupByColTag];
    }
    return result.toLowerCase();
}

function _aggregateColumn(bucketResult, columnDef, groupBy) {
    var result;
    var aggregationMethod = _resolveAggregationMethod(columnDef, groupBy);
    switch (aggregationMethod) {
        case "sum":
            result = _straightSumAggregation({data: bucketResult, columnDef: columnDef});
            break;
        case "average":
            result = _average({data: bucketResult, columnDef: columnDef});
            break;
        case "count":
            result = _count({data: bucketResult, columnDef: columnDef});
            break;
        case "count_distinct":
            result = _countDistinct({data: bucketResult, columnDef: columnDef});
            break;
        case "count_and_distinct":
            result = _countAndDistinct({data: bucketResult, columnDef: columnDef});
            break;
        default :
            result = "";
    }
    return result;
}

function _straightSumAggregation(options) {
    var data = options.data, columnDef = options.columnDef, result = 0, temp = 0;
    for (var i = 0; i < data.length; i++) {
        temp = data[i][columnDef.colTag] || 0;
        result += temp;
    }
    return result;
}
function _average(options) {
    if (options.columnDef.weightBy)
        return _weightedAverage(options);
    else
        return _simpleAverage(options);
}
function _simpleAverage(options) {
    var sum = _straightSumAggregation(options);
    return options.data.length == 0 ? 0 : sum / options.data.length;
}

function _weightedAverage(options) {
    var data = options.data, columnDef = options.columnDef, weightBy = options.columnDef.weightBy;
    var sumProduct = 0;
    for (var i = 0; i < data.length; i++)
        sumProduct += (data[i][columnDef.colTag] || 0 ) * (data[i][weightBy.colTag] || 0);

    var weightSum = _straightSumAggregation({data: data, columnDef: weightBy});
    return weightSum == 0 ? 0 : sumProduct / weightSum;
}

function _count(options) {
    var data = options.data, columnDef = options.columnDef;
    return options.data.length || 0;
}

function _countDistinct(options) {
    var data = options.data, columnDef = options.columnDef;
    var values = {}, i, prop;
    for (i = 0; i < options.data.length; i++){
        if ( !data[i][columnDef.colTag] ) continue;
        values[data[i][columnDef.colTag]] = 1;
    }
    var result = 0;
    for (prop in values)
        if (values.hasOwnProperty(prop))
            result++;
    return result == 1 ? data[0][columnDef.colTag] : result;
}

function _countAndDistinct(options) {
    var count = _count(options);
    var distinctCount = _countDistinct(options);
    return count == 1 ? distinctCount : "(" + distinctCount + "/" + count + ")"
}