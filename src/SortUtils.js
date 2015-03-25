function genericValueBasedSorter(a, b) {
    var returnValue = 0;
    if (!a[this.colTag] && (a[this.colTag] !== 0 || this.formatConfig.showZeroAsBlank) && b[this.colTag])
        returnValue = 1;
    else if (a[this.colTag] && !b[this.colTag] && (b[this.colTag] !== 0 || this.formatConfig.showZeroAsBlank))
        returnValue = -1;
    else if (a[this.colTag] < b[this.colTag])
        returnValue = -1;
    else if (a[this.colTag] > b[this.colTag])
        returnValue = 1;

    return returnValue;
}

function genericValueBasedReverseSorter(a, b) {
    var returnValue = 0;
    if (!a[this.colTag] && (a[this.colTag] !== 0 || this.formatConfig.showZeroAsBlank) && b[this.colTag])
        returnValue = 1;
    else if (a[this.colTag] && !b[this.colTag] && (b[this.colTag] !== 0 || this.formatConfig.showZeroAsBlank))
        returnValue = -1;
    else if (a[this.colTag] < b[this.colTag])
        returnValue = 1;
    else if (a[this.colTag] > b[this.colTag])
        returnValue = -1;

    return returnValue;
}

function dateDetailSort(a, b) {
    var returnValue = new Date(a[this.colTag]) - new Date(b[this.colTag]);
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
            return genericValueBasedSorter;
    }
}

function getReverseSortFunction(sortByColumnDef) {
    var format = sortByColumnDef.format || "";
    if (!sortByColumnDef.sort) {
        switch (format) {
            case "date":
                return dateDetailSort;
            default :
                return genericValueBasedReverseSorter;
        }
    }
}



