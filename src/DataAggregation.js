/**
 * Client side aggregation engine to convert a flag data structure of array of objects
 * into a structured array by computing aggregated values specified by the columns specified 'groupBy'
 *
 * @param data
 * @param columnDefs
 * @param groupBy array of objects with attributes that specify how to group the data
 * @constructor
 */
function groupData(data, groupBy, columnDefs) {
    var bucketResults = buildDataBuckets(data, groupBy);
    var aggregationResults = aggregateBuckets(bucketResults, columnDefs, groupBy);
    return aggregationResults.concat(data);
}

function straightSumAggregation(options) {
    var data = options.data, columnDef = options.columnDef, result = 0, temp = 0;
    for (var i = 0; i < data.length; i++) {
        temp = data[i][columnDef.colTag] || 0;
        result += temp;
    }
    return result;
}
function average(options) {
    if (options.columnDef.weightBy)
        return weightedAverage(options);
    else
        return simpleAverage(options);
}
function simpleAverage(options) {
    var sum = straightSumAggregation(options);
    return options.data.length == 0 ? 0 : sum / options.data.length;
}

function weightedAverage(options) {
    var data = options.data, columnDef = options.columnDef, weightBy = options.columnDef.weightBy;
    var sumProduct = 0;
    for (var i = 0; i < data.length; i++)
        sumProduct += (data[i][columnDef.colTag] || 0 ) * (data[i][weightBy.colTag] || 0);

    var weightSum = straightSumAggregation({data: data, columnDef: weightBy});
    return weightSum == 0 ? 0 : sumProduct / weightSum;
}

function count(options) {
    var data = options.data, columnDef = options.columnDef;
    var count = 0, i;
    for (i = 0; i < options.data.length; i++)
        if (data[i][columnDef.colTag])
            count++;
    return count;
}

function countDistinct(options) {
    var data = options.data, columnDef = options.columnDef;
    var values = {}, i, prop;
    for (i = 0; i < options.data.length; i++)
        values[data[i][columnDef.colTag]] = 1;
    var result = 0;
    for (prop in values)
        if (values.hasOwnProperty(prop))
            result++;
    return result == 1 ? data[0][columnDef.colTag] : result;
}

/* Helpers */
/**
 * find the right sector name for the current row for the given level of row grouping
 * this method can take partition groupBy columns that are numeric in nature and bucket rows based on where they fall
 * in the partition
 * @param groupBy the column to group groupBy
 * @param row the data row to determine the sector name for
 */
function getSectorName(row, groupBy) {
    var result = "", i;
    if (groupBy.format == "number" || groupBy.format == "currency") {
        if (groupBy.groupByRange) {
            for (i = 0; i < groupBy.groupByRange.length; i++) {
                if (row[groupBy.colTag] < groupBy.groupByRange[i]) {
                    result = groupBy.text + " " + (i != 0 ? groupBy.groupByRange[i - 1] : 0) + " - " + groupBy.groupByRange[i];
                    break;
                }
            }
            if (!result)
                result = groupBy.text + " " + groupBy.groupByRange[groupBy.groupByRange.length - 1] + "+";
        }
        else {
            result = groupBy.text;
        }
    } else {
        result = row[groupBy.colTag];
    }
    return result;
}
function extractSectors(row, groupBy) {
    var results = [];
    for (var i = 0; i < groupBy.length; i++) {
        var sectorName = getSectorName(row, groupBy[i]);
        results.push(sectorName);
    }
    return results;
}

function buildDataBuckets(data, groupBy) {
    var results = {};
    for (var i = 0; i < data.length; i++) {
        var sectorPath = extractSectors(data[i], groupBy);
        data[i].sectorPath = sectorPath;
        data[i].isDetail = true;
        for (var j = 0; j < sectorPath.length; j++) {
            var subSectorPath = sectorPath.slice(0, j + 1);
            var subSectorKey = generateSectorKey(subSectorPath);
            if (!results[subSectorKey])
                results[subSectorKey] = {data: [], sectorPath: subSectorPath};
            results[subSectorKey].data.push(data[i]);
        }
    }
    return results;
}
/**
 * @param bucketResults structures that look like: { key1: [{...},{...},...], ... }
 * @param columnDefs
 */
function aggregateBuckets(bucketResults, columnDefs, groupBy) {
    var result = [];
    for (var sectorKey in bucketResults) {
        if (bucketResults.hasOwnProperty(sectorKey)) {
            var singleSectorResult = aggregateSector(bucketResults[sectorKey], columnDefs, groupBy);
            result.push(singleSectorResult);
        }
    }
    return result;
}
function aggregateSector(bucketResult, columnDefs, groupBy) {
    var result = {};
    result.sectorPath = bucketResult.sectorPath;
    result[columnDefs[0].colTag] = bucketResult.sectorPath[bucketResult.sectorPath.length - 1];
    for (var i = 1; i < columnDefs.length; i++) {
        result[columnDefs[i].colTag] = aggregateColumn(bucketResult, columnDefs[i], groupBy);
    }
    return result;
}
function aggregateColumn(bucketResult, columnDef, groupBy) {
    var result;
    var aggregationMethod = resolveAggregationMethod(columnDef, groupBy);
    switch (aggregationMethod) {
        case "sum":
            result = straightSumAggregation({data: bucketResult.data, columnDef: columnDef});
            break;
        case "average":
            result = average({data: bucketResult.data, columnDef: columnDef});
            break;
        case "count":
            result = count({data: bucketResult.data, columnDef: columnDef});
            break;
        case "count_distinct":
            result = countDistinct({data: bucketResult.data, columnDef: columnDef});
            break;
        default :
            result = "";
    }
    return result;
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
function resolveAggregationMethod(columnDef, groupBy) {
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
