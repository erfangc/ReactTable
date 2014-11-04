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

    columnDef.formatConfig = columnDef.formatConfig != null ? columnDef.formatConfig : buildLAFConfigObject(columnDef);
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
        // apply comma separator
        if (formatConfig.separator)
            value = applyThousandSeparator(value);
    }
    return value;
}

function applyThousandSeparator(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

;/**
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
;/** @jsx React.DOM */

/**
 * The code for displaying/rendering data in a tabular format should be self-explanatory. What is worth noting is how
 * row grouping is handled. The approach involves identifying similar rows through the use of an array of strings called
 * 'sectorPath'. Rows with the same/similar sectorPath(s) are considered to be related. If two rows have the same sectorPath array
 * they belong to the same exact row group. If two rows partially share sectorPath are considered to share the same tree
 * (i.e. some head subset of their sectorPath array match)
 *
 * @author Erfang Chen
 */

var SECTOR_SEPARATOR = "#";

var ReactTable = React.createClass({displayName: 'ReactTable',

    getInitialState: ReactTableGetInitialState,

    handleSort: ReactTableHandleSort,
    handleAdd: ReactTableHandleAdd,
    handleRemove: ReactTableHandleRemove,
    handleToggleHide: ReactTableHandleToggleHide,
    handleGroupBy: ReacTableHandleGroupBy,
    handlePageClick: ReactTableHandlePageClick,
    handleRowSelect: ReactHandleRowSelect,
    handleCollapseAll: function () {
        var collapsedSectorPaths = getInitiallyCollapsedSectorPaths(this.state.data);
        this.setState({
            currentPage: 1,
            collapsedSectorPaths: collapsedSectorPaths,
            collapsedSectorKeys: extractSectorPathKeys(collapsedSectorPaths)
        });
    },
    handleExpandAll: function () {
        this.setState({
            collapsedSectorPaths: {},
            collapsedSectorKeys: []
        })
    },
    addColumn: function (columnDef, data) {
        this.state.columnDefs.push(columnDef);
        var state = {};
        state.columnDefs = this.state.columnDefs;
        if (data)
            state.data = deepCopyData(data);
        this.setState(state);
    },
    replaceData: function(data){
        var state = {};
        if (data)
            state.data = deepCopyData(data);
        this.setState(state);
    },
    componentDidMount: function () {
        setTimeout(function () {
            adjustHeaders.call(this);
        }.bind(this));
        window.addEventListener('resize', adjustHeaders.bind(this));
    },
    componentWillUnmount: function () {
        window.removeEventListener('resize', adjustHeaders.bind(this));
    },
    componentDidUpdate: adjustHeaders,

    render: function () {
        var uncollapsedRows = [];
        // determine which rows are unhidden based on which sectors are collapsed
        for (var i = 0; i < this.state.data.length; i++) {
            var row = this.state.data[i];
            if (!shouldHide(row, this.state.collapsedSectorPaths, this.state.collapsedSectorKeys))
                uncollapsedRows.push(row);
        }
        // determine which unhidden rows to display on the current page
        var paginationAttr = getPageArithmetics(this, uncollapsedRows);
        var rowsToDisplay = uncollapsedRows.slice(paginationAttr.lowerVisualBound, paginationAttr.upperVisualBound + 1);

        var rows = rowsToDisplay.map(function (row) {
            var rowKey = this.props.rowKey;
            return (React.createElement(Row, {
                data: row, 
                key: generateRowKey(row, rowKey), 
                isSelected: isRowSelected.call(this, row), 
                onSelect: this.handleRowSelect, 
                columnDefs: this.state.columnDefs, 
                toggleHide: this.handleToggleHide}));
        }, this);

        var headers = buildHeaders(this);
        var footer = buildFooter(this, paginationAttr);

        var containerStyle = {};
        if (this.state.height && parseInt(this.state.height) > 0) {
            containerStyle.height = this.state.height;
        }
        return (
            React.createElement("div", {id: this.state.uniqueId, className: "rt-table-container"}, 
                headers, 
                React.createElement("div", {style: containerStyle, className: "rt-scrollable"}, 
                    React.createElement("table", {className: "rt-table"}, 
                        React.createElement("tbody", null, 
                        rows
                        )
                    )
                ), 
                footer
            )
        );
    }
});
var Row = React.createClass({displayName: 'Row',
    render: function () {
        var cells = [buildFirstCellForRow(this.props)];
        for (var i = 1; i < this.props.columnDefs.length; i++) {
            var columnDef = this.props.columnDefs[i];
            var lookAndFeel = buildCellLookAndFeel(columnDef, this.props.data);
            var cx = React.addons.classSet;
            var classes = cx(lookAndFeel.classes);
            cells.push(
                React.createElement("td", {
                    className: classes, 
                    style: lookAndFeel.styles, 
                    key: columnDef.colTag}, 
                    lookAndFeel.value
                )
            );
        }
        var cx = React.addons.classSet;
        var classes = cx({
            'selected': this.props.isSelected && this.props.data.isDetail,
            'summary-selected': this.props.isSelected && !this.props.data.isDetail
        });
        var styles = {
            "cursor": this.props.data.isDetail ? "pointer" : "inherit"
        };
        return (React.createElement("tr", {onClick: this.props.onSelect.bind(null, this.props.data), className: classes, style: styles}, cells));
    }
});
var PageNavigator = React.createClass({displayName: 'PageNavigator',
    render: function () {
        var self = this;
        var cx = React.addons.classSet;
        var prevClass = cx({
            disabled: (this.props.activeItem == 1)
        });
        var nextClass = cx({
            disabled: (this.props.activeItem == this.props.numPages)
        });

        var items = this.props.items.map(function (item) {
            return (
                React.createElement("li", {key: item, className: self.props.activeItem == item ? 'active' : ''}, 
                    React.createElement("a", {href: "#", onClick: self.props.handleClick.bind(null, item)}, item)
                )
            )
        });
        return (
            React.createElement("ul", {className: prevClass, className: "pagination pull-right"}, 
                React.createElement("li", {className: nextClass}, 
                    React.createElement("a", {className: prevClass, href: "#", onClick: this.props.handleClick.bind(null, this.props.activeItem - 1)}, "«")
                ), 
                items, 
                React.createElement("li", {className: nextClass}, 
                    React.createElement("a", {className: nextClass, href: "#", onClick: this.props.handleClick.bind(null, this.props.activeItem + 1)}, "»")
                )
            )
        );
    }
});

/* Virtual DOM builder helpers */

function buildHeaders(table) {
    var columnDef = table.state.columnDefs[0], i = 1, style = {}, menuStyle = {};
    // 1st column
    var firstColumn = (
        React.createElement("div", {style: {textAlign: "left"}, className: "rt-header-element", key: columnDef.colTag}, 
            React.createElement("a", {className: "btn-link"}, columnDef.text), 
            React.createElement("div", {style: {"left": "0%"}, className: "rt-header-menu"}, 
                React.createElement("div", {onClick: table.handleSort.bind(table, columnDef, true)}, "Sort Asc"), 
                React.createElement("div", {onClick: table.handleSort.bind(table, columnDef, false)}, "Sort Dsc"), 
                React.createElement("div", {onClick: table.handleGroupBy.bind(table, columnDef)}, "Summarize"), 
                React.createElement("div", {onClick: table.handleGroupBy.bind(table, null)}, "Clear Summary"), 
                React.createElement("div", {onClick: table.handleCollapseAll.bind(table, null)}, "Collapse All"), 
                React.createElement("div", {onClick: table.handleExpandAll.bind(table)}, "Expand All")
            )
        )
    );
    // the rest
    var headerColumns = [firstColumn];
    for (i = 1; i < table.state.columnDefs.length; i++) {
        columnDef = table.state.columnDefs[i];
        style = {textAlign: getColumnAlignment(columnDef)};
        menuStyle = {};
        if (style.textAlign == 'right') menuStyle.right = "0%";
        else menuStyle.left = "0%";
        headerColumns.push(
            React.createElement("div", {style: style, className: "rt-header-element", key: columnDef.colTag}, 
                React.createElement("a", {className: "btn-link"}, columnDef.text), 
                React.createElement("div", {style: menuStyle, className: "rt-header-menu"}, 
                    React.createElement("div", {onClick: table.handleSort.bind(table, columnDef, true)}, "Sort Asc"), 
                    React.createElement("div", {onClick: table.handleSort.bind(table, columnDef, false)}, "Sort Dsc"), 
                    React.createElement("div", {onClick: table.handleGroupBy.bind(table, columnDef)}, "Summarize"), 
                    React.createElement("div", {onClick: table.handleRemove.bind(table, columnDef)}, "Remove Column")
                )
            )
        );
    }
    // the plus sign at the end
    headerColumns.push(
        React.createElement("span", {className: "rt-header-element rt-add-column", style: {"textAlign": "center"}}, 
            React.createElement("a", {className: "btn-link", onClick: table.handleAdd}, 
                React.createElement("strong", null, "+")
            )
        ));
    return (
        React.createElement("div", {key: "header", className: "rt-headers"}, headerColumns)
    );
}
function buildFirstCellForRow(props) {
    var data = props.data, columnDef = props.columnDefs[0], toggleHide = props.toggleHide;
    var firstColTag = columnDef.colTag;

    // if sectorPath is not available - return a normal cell
    if (!data.sectorPath)
        return React.createElement("td", {key: firstColTag}, data[firstColTag]);

    // styling & ident
    var identLevel = !data.isDetail ? data.sectorPath.length - 1 : data.sectorPath.length;
    var firstCellStyle = {
        "paddingLeft": (10 + identLevel * 25) + "px", "borderRight": "1px #ddd solid"
    };

    if (data.isDetail) {
        var result = React.createElement("td", {style: firstCellStyle, key: firstColTag}, data[firstColTag]);
    } else {
        result =
            (
                React.createElement("td", {style: firstCellStyle, key: firstColTag}, 
                    React.createElement("a", {onClick: toggleHide.bind(null, data), className: "btn-link"}, 
                        React.createElement("strong", null, data[firstColTag])
                    )
                )
            );
    }
    return result;
}
function buildFooter(table, paginationAttr) {
    return table.props.columnDefs.length > 0 ?
        (React.createElement(PageNavigator, {
            items: paginationAttr.allPages.slice(paginationAttr.pageDisplayRange.start, paginationAttr.pageDisplayRange.end), 
            activeItem: table.state.currentPage, 
            numPages: paginationAttr.pageEnd, 
            handleClick: table.handlePageClick})) : null;
}

function getPageArithmetics(table, data) {
    var result = {};
    result.pageSize = table.props.pageSize || 50;
    result.maxDisplayedPages = table.props.maxDisplayedPages || 10;

    result.pageStart = 1;
    result.pageEnd = Math.ceil(data.length / result.pageSize);

    result.allPages = [];
    for (var i = result.pageStart; i <= result.pageEnd; i++) {
        result.allPages.push(i);
    }
    // derive the correct page navigator selectable pages from current / total pages
    result.pageDisplayRange = computePageDisplayRange(table.state.currentPage, result.maxDisplayedPages);

    result.lowerVisualBound = (table.state.currentPage - 1) * result.pageSize;
    result.upperVisualBound = Math.min(table.state.currentPage * result.pageSize - 1, data.length);

    return result;

}
/* Sector tree rendering utilities */

function shouldHide(data, collapsedSectorPaths, collapsedSectorKeys) {
    var result = false;
    var hasCollapsedAncestor = areAncestorsCollapsed(data.sectorPath, collapsedSectorPaths, collapsedSectorKeys);
    var isSummaryRow = !data.isDetail;
    var immediateSectorCollapsed = (collapsedSectorPaths[generateSectorKey(data.sectorPath)] != null);
    if (hasCollapsedAncestor)
        result = true;
    else if (immediateSectorCollapsed && !isSummaryRow)
        result = true;
    return result;
}

/**
 * Compares sector path passed to all collapsed sectors to determine if one of the collapsed sectors is the given sector's ancestor
 * @param sectorPath [array] the sectorPath to perform comparison on
 * @param collapsedSectorPaths a map (object) where properties are string representation of the sectorPath considered to be collapsed
 * @param collapsedSectorKeys the array of properties (keys) for the above param - used to improve performance
 * @returns {boolean}
 */
function areAncestorsCollapsed(sectorPath, collapsedSectorPaths, collapsedSectorKeys) {
    var max = collapsedSectorKeys.length;
    for (var i = 0; i < max; i++) {
        if (isSubSectorOf(sectorPath, collapsedSectorPaths[collapsedSectorKeys[i]]))
            return true;
    }
    return false;
}
function isSubSectorOf(subSectorCandidate, superSectorCandidate) {
    // lower length in SP means higher up on the chain
    if (subSectorCandidate.length <= superSectorCandidate.length)
        return false;
    for (var i = 0; i < superSectorCandidate.length; i++) {
        if (subSectorCandidate[i] != superSectorCandidate[i])
            return false;
    }
    return true;
}

/* Other utility functions */
function sectorPathMatchesExactly(sectorPath1, sectorPath2) {
    "use strict";
    var result = true, i = 0, loopSize = sectorPath1.length;
    if (sectorPath1.length != sectorPath2.length)
        result = false;
    else
        for (i = 0; i < loopSize; i++)
            if (sectorPath1[i] != sectorPath2[i])
                result = false;
    return result
}
function generateRowKey(row, rowKey) {
    var key;
    if (!row.isDetail) {
        key = generateSectorKey(row.sectorPath);
    }
    else if (rowKey)
        key = row[rowKey];
    else {
        key = row.rowCount;
    }
    return key;
}
function generateSectorKey(sectorPath) {
    if (!sectorPath)
        return "";
    return sectorPath.join(SECTOR_SEPARATOR);
}

function deepCopyData(data) {
    var rowCount = 0;
    return data.map(function (row) {
        var copy = {};
        for (var prop in row)
            if (row.hasOwnProperty(prop))
                copy[prop] = row[prop];
        copy.isDetail = true;
        copy.rowCount = rowCount;
        rowCount++;
        return copy;
    });
}
function getInitiallyCollapsedSectorPaths(data) {
    var result = {};
    data.map(function (row) {
        if (row.sectorPath && row.isDetail) {
            var sectorPathKey = generateSectorKey(row.sectorPath);
            if (!result[sectorPathKey])
                result[sectorPathKey] = row.sectorPath;
        }
    });
    return result;
}
function computePageDisplayRange(currentPage, maxDisplayedPages) {
    // total number to allocate
    var displayUnitsLeft = maxDisplayedPages;
    // allocate to the left
    var leftAllocation = Math.min(Math.floor(displayUnitsLeft / 2), currentPage - 1);
    var rightAllocation = displayUnitsLeft - leftAllocation;
    return {
        start: currentPage - leftAllocation - 1,
        end: currentPage + rightAllocation - 1
    }
}

/* TODO wean off jquery - instead of adjusting headers through DOM selection and manipulation
 the event listener should just re-render the table. the render func should figure out the appropriate width of the headers
 of all cells/headers
 */
function adjustHeaders() {
    var id = this.state.uniqueId;
    var counter = 0;
    var headerElems = $("#" + id + " .rt-header-element");
    var padding = parseInt(headerElems.first().css("padding-left")) || 0;
    padding += parseInt(headerElems.first().css("padding-right")) || 0;
    headerElems.each(function () {
        var width = $('#' + id + ' .rt-table tr:first td:eq(' + counter + ')').outerWidth() - padding;
        $(this).width(width);
        counter++;
    });
}

$(document).ready(function () {
    $('.rt-scrollable').bind('scroll', function () {
        $(".rt-headers").scrollLeft($(this).scrollLeft());
    });
});

var idCounter = 0;
function uniqueId(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
};
;function ReactTableGetInitialState() {
    var initialStates = prepareTableData.call(this, this.props);
    var selectedRows = getInitiallySelectedRows(this.props.selectedRows);
    return {
        uniqueId: uniqueId("table"),
        currentPage: 1,
        height: this.props.height,
        data: initialStates.data,
        columnDefs: this.props.columnDefs,
        collapsedSectorPaths: initialStates.collapsedSectorPaths,
        collapsedSectorKeys: initialStates.collapsedSectorKeys,
        selectedRows: selectedRows
    };
}

function ReactTableHandleSort(columnDefToSortBy, sortAsc) {
    var data = this.state.data;
    var sortOptions = {
        sectorSorter: defaultSectorSorter,
        detailSorter: getSortFunction(columnDefToSortBy),
        sortDetailBy: columnDefToSortBy,
        sortAsc: sortAsc
    };
    data.sort(sorterFactory.call(this, sortOptions));
    this.setState({
        data: data,
        sorting: columnDefToSortBy
    });
}

function ReacTableHandleGroupBy(columnDef) {
    this.props.groupBy = columnDef ? [columnDef] : null;
    var initialStates = prepareTableData.call(this, this.props);
    this.state.selectedRows.summaryRows = [];
    this.setState({
        currentPage: 1,
        data: initialStates.data,
        selectedRows: this.state.selectedRows,
        collapsedSectorPaths: initialStates.collapsedSectorPaths,
        collapsedSectorKeys: initialStates.collapsedSectorKeys
    });
}

function ReactTableHandleAdd() {
    if (this.props.beforeColumnAdd)
        this.props.beforeColumnAdd()
}

function ReactTableHandleRemove(columnDefToRemove) {
    var loc = this.state.columnDefs.indexOf(columnDefToRemove);
    var newColumnDefs = [];
    for (var i = 0; i < this.state.columnDefs.length; i++) {
        if (i != loc)
            newColumnDefs.push(this.state.columnDefs[i]);
    }
    this.setState({
        columnDefs: newColumnDefs
    });
    // TODO pass copies of these variables to avoid unintentional perpetual binding
    if (this.props.afterColumnRemove != null)
        this.props.afterColumnRemove(newColumnDefs, columnDefToRemove);
}

function ReactTableHandleToggleHide(summaryRow, event) {
    event.stopPropagation();
    var sectorKey = generateSectorKey(summaryRow.sectorPath);
    if (this.state.collapsedSectorPaths[sectorKey] == null) {
        this.state.collapsedSectorPaths[sectorKey] = summaryRow.sectorPath;
        this.state.collapsedSectorKeys.push(sectorKey);
    }
    else {
        delete this.state.collapsedSectorPaths[sectorKey];
        this.state.collapsedSectorKeys.splice(this.state.collapsedSectorKeys.indexOf(sectorKey), 1);
    }
    this.setState({
        collapsedSectorPaths: this.state.collapsedSectorPaths,
        collapsedSectorKeys: this.state.collapsedSectorKeys
    });
}

function ReactTableHandlePageClick(page, event) {
    event.preventDefault();
    var pageSize = this.props.pageSize || 10;
    var maxPage = Math.ceil(this.state.data.length / pageSize);
    if (page < 1 || page > maxPage)
        return;
    this.setState({
        currentPage: page
    });
}

/* Helpers */
function extractSectorPathKeys(collapsedSectorPaths) {
    "use strict";
    var results = [];
    for (var key in collapsedSectorPaths)
        if (collapsedSectorPaths.hasOwnProperty(key))
            results.push(key);
    return results;
}

function prepareTableData(props) {
    // make defensive copy of the data - surprisingly not a huge performance hit
    var data = deepCopyData(props.data);
    if (props.groupBy) {
        data = groupData(data, props.groupBy, props.columnDefs);
        var sortOptions = {sectorSorter: defaultSectorSorter, detailSorter: defaultDetailSorter};
        data.sort(sorterFactory.call(this, sortOptions));
    }
    // optimization code for sector path key retrieval so we do not need for (var in collect) syntax for each row
    var collapsedSectorPaths = getInitiallyCollapsedSectorPaths(data);
    return {
        collapsedSectorPaths: collapsedSectorPaths,
        collapsedSectorKeys: extractSectorPathKeys(collapsedSectorPaths),
        data: data
    };
}
;/* Main Event Handler */
function ReactHandleRowSelect(row) {
    "use strict";
    var selectionSubType = null,
        selectionKey = null,
        becameSelected = false,
        callbackProcessingDelegate = null;

    if (row.isDetail) {
        selectionSubType = 'detailRows';
        selectionKey = generateRowKey(row, this.props.rowKey);
        callbackProcessingDelegate = processDetailRowSelect;
    } else {
        selectionSubType = 'summaryRows';
        selectionKey = generateSectorKey(row.sectorPath);
        callbackProcessingDelegate = processSummaryRowSelect;
    }

    if (isRowSelected.call(this, row))
        delete this.state.selectedRows[selectionSubType][selectionKey];
    else {
        this.state.selectedRows[selectionSubType][selectionKey] = 1;
        becameSelected = true;
    }

    // invoke callback processing logic
    callbackProcessingDelegate.call(this, row, becameSelected);
    this.setState({
        selectedRows: this.state.selectedRows
    });
}

/* Helper Functions */
function processSummaryRowSelect(summaryRow, selectionState) {
    "use strict";
    var result = {detailRows: [], summaryRow: summaryRow}, i = 0, dataSize = this.state.data.length, row = null;
    for (i = 0; i < dataSize; i++) {
        row = this.state.data[i];
        if (row.isDetail &&
            (isSubSectorOf(row.sectorPath, summaryRow.sectorPath) ||
            sectorPathMatchesExactly(row.sectorPath, summaryRow.sectorPath))
        )
            result.detailRows.push(row);
    }
    if (this.props.onSummarySelectCallback)
        this.props.onSummarySelectCallback.call(this, result, selectionState);
}

function processDetailRowSelect(row, selectionState) {
    "use strict";
    var rowKey = this.props.rowKey;
    if (!rowKey)
        return;
    if (this.props.onSelectCallback)
        this.props.onSelectCallback.call(this, row, selectionState);
}

function getInitiallySelectedRows(selectedRowKeys) {
    var result = {detailRows: {}, summaryRows: {}};
    selectedRowKeys = selectedRowKeys || [];
    for (var i = 0; i < selectedRowKeys.length; i++)
        result.detailRows[selectedRowKeys[i]] = 1;
    return result;
}

function isRowSelected(row) {
    var result = false, sectorPathKey = null, rowKey = null;
    if (row.isDetail) {
        rowKey = generateRowKey(row, this.props.rowKey);
        result = (this.state.selectedRows.detailRows[rowKey] != null);
    } else {
        sectorPathKey = generateSectorKey(row.sectorPath);
        result = (this.state.selectedRows.summaryRows[sectorPathKey] != null);
    }
    return result;
}
;/**
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
