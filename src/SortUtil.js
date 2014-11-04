/**
 * Master sorter wrapper function that attempts to get the raw data array into the correct order
 * failing to sort the array into the correct order is disastrous for the table as rows are created
 * per the ordering in the main data array
 *
 * this function will attempt to sort the sectors accordingly (by using either a custom sector sorter or just comparing sector path keys)
 * and will delegate detail row sorting to a detail sorter function
 *
 * @param a
 * @param b
 */
function sorterFactory(options) {
    var sectorSorter = options.sectorSorter,
        detailSorter = options.detailSorter,
        sortSummaryBy = options.sortSummaryBy,
        sortDetailBy = options.sortDetailBy;
    sortAsc = options.sortAsc;

    return function (a, b) {
        // compare sector
        var result = 0;
        result = sectorSorter.call(sortSummaryBy, a, b);
        // same sector therefore, summary > detail
        if (result == 0) {
            if (a.isDetail && !b.isDetail) {
                result = 1;
            } else if (b.isDetail && !a.isDetail) {
                result = -1;
            } else {
                result = 0;
            }
            // both are detail rows ... use detail sorter or just return 0
            if (result == 0) {
                result = detailSorter.call(sortDetailBy, a, b);
                if (!sortAsc)
                    result *= -1;
            }
        }
        return result;
    }.bind(this);
}

function defaultSectorSorter(a, b) {
    return generateSectorKey(a.sectorPath).localeCompare(generateSectorKey(b.sectorPath));
}

function defaultDetailSorter(a, b) {
    return a.rowCount - b.rowCount;
}

/* Detail sorters - used when user tries to sort the columns after table has been rendered */

function genericDetailSort(a, b) {
    var returnValue = 0;
    if (a[this.colTag] < b[this.colTag])
        returnValue = -1;
    else if (a[this.colTag] > b[this.colTag])
        returnValue = 1;
    if (this.asc)
        returnValue *= -1;
    return returnValue;
}

function dateDetailSort(a, b) {
    var returnValue = new Date(a[this.colTag]) - new Date(b[this.colTag]);
    if (this.asc)
        returnValue *= -1;
    return returnValue;
}

function getSortFunction(sortByColumnDef) {
    var format = sortByColumnDef.format || "";
    // if the user provided a custom sort function for the column, use that instead
    if (sortByColumnDef.sort)
        return sortByColumnDef.sort;
    switch (format) {
        case "date":
            return dateDetailSort;
        default :
            return genericDetailSort;
    }
}
