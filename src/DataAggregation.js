/**
 * find the right sector name for the current row for the given level of row grouping
 * this method can take partition subtotalBy columns that are numeric in nature and partition rows based on where they fall
 * in the partition
 * @param subtotalBy the column to group subtotalBy
 * @param row the data row to determine the sector name for
 */
function getSectorName(row, subtotalBy) {
    var sectorName = "", sortIndex = null;
    if (subtotalBy.format == "number" || subtotalBy.format == "currency") {
        var result = resolvePartitionName(subtotalBy, row);
        sectorName = result.sectorName;
        sortIndex = result.sortIndex;
    } else
        sectorName = row[subtotalBy.colTag];
    return {sectorName: sectorName || "Other", sortIndex: sortIndex};
}

function aggregateSector(partitionResult, columnDefs, subtotalBy) {
    var result = {};
    for (var i = 0; i < columnDefs.length; i++)
        result[columnDefs[i].colTag] = aggregateColumn(partitionResult, columnDefs[i], subtotalBy);
    return result;
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function resolvePartitionName(subtotalBy, row) {
    var sectorName = "", sortIndex = "";
    if (subtotalBy.subtotalByRange) {
        for (var i = 0; i < subtotalBy.subtotalByRange.length; i++) {
            if (row[subtotalBy.colTag] < subtotalBy.subtotalByRange[i]) {
                sectorName = subtotalBy.text + " " + (i != 0 ? subtotalBy.subtotalByRange[i - 1] : 0) + " - " + subtotalBy.subtotalByRange[i];
                sortIndex = i;
                break;
            }
        }
        if (!sectorName) {
            sectorName = subtotalBy.text + " " + subtotalBy.subtotalByRange[subtotalBy.subtotalByRange.length - 1] + "+";
            sortIndex = i + 1;
        }
    }
    else
        sectorName = subtotalBy.text;
    return {sectorName: sectorName, sortIndex: sortIndex};
}

/**
 * solves for the correct aggregation method given the current columnDef being aggregated
 * and table settings. sophisticated aggregation methods (such as conditional aggregation) can be determined here
 *
 * conditional aggregation is the ability to switch up aggregation method based on the columnDef used in group by
 * the columnDef property `conditionalAggregationMethod` takes the an object {key:value, key2: value2} where `key(s)`
 * are the colTag and `value{s}` is the corresponding aggregation method to use when table subtotalBy is set to the colTag specified in the key
 *
 * @param columnDef
 * @param subtotalBy
 */
function resolveAggregationMethod(columnDef, subtotalBy) {
    var result;
    if (typeof columnDef.aggregationFunction === 'function')
        result = columnDef.aggregationFunction;
    else if (typeof columnDef.aggregationMethod === 'string')
        result = columnDef.aggregationMethod.toLowerCase();
    // resolve conditional aggregation method
    else if (columnDef.conditionalAggregationMethod && subtotalBy && subtotalBy.length == 1) {
        var subtotalByColTag = subtotalBy[0].colTag;
        if (columnDef.conditionalAggregationMethod[subtotalByColTag])
            result = columnDef.conditionalAggregationMethod[subtotalByColTag].toLowerCase();
    }
    return result;
}

function aggregateColumn(partitionResult, columnDef, subtotalBy) {
    var result;
    var aggregationMethod = resolveAggregationMethod(columnDef, subtotalBy);

    // call custom aggregation function or use one of the stock aggregation functions
    if (typeof aggregationMethod === 'function')
        result = aggregationMethod({data: partitionResult, columnDef: columnDef});
    else
        switch (aggregationMethod) {
            case "sum":
                result = _straightSumAggregation({data: partitionResult, columnDef: columnDef});
                break;
            case "average":
                result = _average({data: partitionResult, columnDef: columnDef});
                break;
            case "count":
                result = _count({data: partitionResult, columnDef: columnDef});
                break;
            case "count_distinct":
                result = _countDistinct({data: partitionResult, columnDef: columnDef});
                break;
            case "count_and_distinct":
                result = _countAndDistinct({data: partitionResult, columnDef: columnDef});
                break;
            case "most_data_points":
                result = _mostDataPoints({data: partitionResult, columnDef: columnDef});
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
    var count = 0;
    for (var i = 0; i < options.data.length; i++) {
        if (options.data[i][options.columnDef.colTag] || options.data[i][options.columnDef.colTag] === 0)
            count++;
    }
    return count == 0 ? "" : sum / count;
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
    return applyThousandSeparator(options.data.length) || 0;
}

/**
 * count the distinct values in an array of column values
 * @param options
 * @return {*}
 * @private
 */
function _countDistinct(options) {
    var data = options.data, columnDef = options.columnDef;

    if (data.length == 0)
        return 0;

    /**
     * collect all rows of the given column in data as an array
     */
    const allData =
        options.data.map(function (row) {
            return row[columnDef.colTag];
        });

    /**
     * iterate through allData - keeping only unique members
     */
    const uniqData = [];
    for (var j = 0; j < allData.length; j++) {
        if (allData[j] !== "" && allData[j] !== null && uniqData.indexOf(allData[j]) == -1)
            uniqData.push(allData[j]);
    }
    return uniqData.length == 1 ? uniqData[0] : applyThousandSeparator(uniqData.length);
}

function _countAndDistinctPureJS(options) {
    var count = _count(options);
    var distinctCount = _countDistinct(options);
    return count == 1 ? distinctCount : "(" + applyThousandSeparator(distinctCount) + "/" + applyThousandSeparator(count) + ")"
}

function _countAndDistinctUnderscoreJS(options) {
    var data = options.data, columnDef = options.columnDef;
    const sortedData = _.pluck(data, columnDef.colTag).sort(function (a, b) {
        if (a === b)
            return 0;
        return a > b ? 1 : -1;
    });
    const uniqData = _.chain(sortedData).uniq(true).compact().value();
    return "(" + (uniqData.length === 1 ? uniqData[0] : applyThousandSeparator(uniqData.length)) + "/" +  applyThousandSeparator(data.length) + ")";
}

/**
 * if underscorejs is included, we will use a much more efficient algo to aggregate and count
 * otherwise a pure javascript approach is used but is slow for large number of rows
 * @param options
 * @return {*}
 * @private
 */
function _countAndDistinct(options) {
    if (typeof _ === 'function')
        return _countAndDistinctUnderscoreJS(options);
    else
        return _countAndDistinctPureJS(options);
}

function _mostDataPoints(options) {
    var best = {count: 0, index: -1};
    for (var i = 0; i < options.data.length; i++) {
        var sizeOfObj = Object.keys(options.data[i]).length;
        if (sizeOfObj > best.count || (sizeOfObj === best.count &&
            options.data[i].aggregationTiebreaker > options.data[best.index].aggregationTiebreaker)) {
            best.count = sizeOfObj;
            best.index = i;
        }
    }
    return best.index == -1 ? "" : options.data[best.index][options.columnDef.colTag];
}