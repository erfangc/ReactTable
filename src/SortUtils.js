const lexicalSorter = {
    asc: function (a, b) {
        var returnValue = 0;
        if (!a[this.colTag] && (a[this.colTag] !== 0 || (this.formatConfig && this.formatConfig.showZeroAsBlank)) && b[this.colTag])
            returnValue = 1;
        else if (a[this.colTag] && !b[this.colTag] && (b[this.colTag] !== 0 || (this.formatConfig && this.formatConfig.showZeroAsBlank)))
            returnValue = -1;
        else if (a[this.colTag] < b[this.colTag])
            returnValue = -1;
        else if (a[this.colTag] > b[this.colTag])
            returnValue = 1;
        return returnValue;
    },
    desc: function (a, b) {
        var returnValue = 0;
        if (!a[this.colTag] && (a[this.colTag] !== 0 || (this.formatConfig && this.formatConfig.showZeroAsBlank)) && b[this.colTag])
            returnValue = 1;
        else if (a[this.colTag] && !b[this.colTag] && (b[this.colTag] !== 0 || (this.formatConfig && this.formatConfig.showZeroAsBlank)))
            returnValue = -1;
        else if (a[this.colTag] < b[this.colTag])
            returnValue = 1;
        else if (a[this.colTag] > b[this.colTag])
            returnValue = -1;
        return returnValue;
    }
};

const dateSorter = {
    asc: function (a, b) {
        return new Date(a[this.colTag]) - new Date(b[this.colTag]);
    },
    desc: function (a, b) {
        return -1 * dateSorter.asc.call(null, a, b);
    }
};

/**
 * resolves t he appropriate sort function for the given `columnDef`
 * if the columnDef comes with a set of sort functions under a `sort` property, it will override the default resolution
 * otherwise determination is made based on `columnDef.format`
 * @param columnDef
 * @param sortType 'asc' or 'desc'
 * @returns {function}
 */
function getSortFunction(columnDef, sortType) {
    const format = columnDef.format || "";
    var sorter = lexicalSorter[sortType].bind(columnDef);
    // if the user provided a custom sort function for the column, use that instead
    if (columnDef.sort && columnDef[sortType])
        sorter = columnDef.sort[sortType].bind(columnDef);
    else if (format === "date")
        sorter = dateSorter[sortType].bind(columnDef);
    return sorter;
}

/**
 * converts the sortBy object which maps colTag to sortType in ['asc', 'desc'] into a array of sort functions
 * @param table the table component
 * @param sortBy an array indicating desired colTags to sort by
 * @param columnDefs columnDefs to use to resolve sort function, if not present it will be pulled from `table`
 */
function convertSortByToFuncs(columnDefs, sortBy) {
    return sortBy.map(function (s) {
        return getSortFunction(findDefByColTag(columnDefs, s.colTag), s.sortType);
    });
}

function findPositionByColTag(columnDefs, colTag) {
    var pos = -1;
    $.each(columnDefs, function (i, columnDef) {
        if (columnDef.colTag === colTag)
            pos = i;
    });
    return pos;
}

function findDefByColTag(columnDefs, colTag) {
    var result = null;
    $.each(columnDefs, function (i, columnDef) {
        if (columnDef.colTag === colTag) {
            result = columnDef;
        }
    });
    return result;
}
