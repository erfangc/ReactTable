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
    // partition
    var bucketResults = buildDataBuckets(data, groupBy);

    // aggregate
    var aggregationResults = aggregateBuckets(bucketResults, columnDefs);

    return aggregationResults.concat(data);
}

/* Aggregation functions TODO implement all */
function straightSumAggregation(options) {
    var data = options.data, columnDef = options.columnDef, result = 0, temp = 0;
    for (var i = 0; i < data.length; i++) {
        temp = data[i][columnDef.colTag] || 0;
        result +=  temp;
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
    return straightSumAggregation(options) / options.data.length;
}

function weightedAverage(options) {
    var data = options.data, columnDef = options.columnDef, weightBy = options.columnDef.weightBy;
    var sumProduct = 0;
    for (var i = 0; i < data.length; i++)
        sumProduct += (data[i][columnDef.colTag] || 0 ) * (data[i][weightBy.colTag] || 0);

    var weightSum = straightSumAggregation({data: data, columnDef: weightBy});
    // TODO does not protect against division by zero
    return sumProduct / weightSum;
}

function count(options) {
    var data = options.data, columnDef = options.columnDef;
}

function countDistinct(options) {
    var data = options.data, columnDef = options.columnDef;
}

/* Helpers */
function extractSectors(row, groupBy) {
    var results = [];
    // TODO handle numerical data categorization
    for (var i = 0; i < groupBy.length; i++) {
        results.push(row[groupBy[i].colTag]);
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
function aggregateBuckets(bucketResults, columnDefs) {
    var result = [];
    for (var sectorKey in bucketResults) {
        if (bucketResults.hasOwnProperty(sectorKey)) {
            var singleSectorResult = aggregateSector(bucketResults[sectorKey], columnDefs);
            result.push(singleSectorResult);
        }
    }
    return result;
}
function aggregateSector(bucketResult, columnDefs) {
    var result = {};
    result.sectorPath = bucketResult.sectorPath;
    result[columnDefs[0].colTag] = bucketResult.sectorPath[bucketResult.sectorPath.length - 1];
    for (var i = 1; i < columnDefs.length; i++) {
        result[columnDefs[i].colTag] = aggregateColumn(bucketResult, columnDefs[i]);
    }
    return result;
}
function aggregateColumn(bucketResult, columnDef) {
    var result;
    switch (columnDef.aggregationMethod) {
        case "SUM":
            result = straightSumAggregation({data: bucketResult.data, columnDef: columnDef});
            break;
        case "AVERAGE":
            result = average({data: bucketResult.data, columnDef: columnDef});
            break;
        default :
            result = "";
        // TODO complete other aggregation techniques
    }
    return result;
}