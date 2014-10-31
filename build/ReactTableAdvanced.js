/** @jsx React.DOM */

/**
 * The code for displaying/rendering data in a tabular format should be self-explanatory. What is worth noting is how
 * row grouping is handled. The approach involves identifying similar rows through the use of an array of strings called
 * 'sectorPath'. Rows with the same/similar sectorPath(s) are considered to be related. If two rows have the same sectorPath array
 * they belong to the same exact row group. If two rows partially share sectorPath are considered to share the same tree
 * (i.e. some head subset of their sectorPath array match)
 *
 * @author Erfang Chen
 */

// TODO handle click events for summary rows
// TODO formatting
var SECTOR_SEPARATOR = "#";

var ReactTable = React.createClass({displayName: 'ReactTable',
    getInitialState: ReactTabeGetInitialState,
    handleSort: ReactTableHandleSort,
    handleAdd: ReactTableHandleAdd,
    handleRemove: ReactTableHandleRemove,
    handleToggleHide: ReactTableHandleToggleHide,
    handleRowSelect: ReactTableHandleRowSelect,
    handlePageClick: ReactTableHandlePageClick,
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
                isSelected: rowKey && this.state.selectedRows[row[rowKey]] ? true : false, 
                onSelect: this.handleRowSelect, 
                columnDefs: this.state.columnDefs, 
                toggleHide: this.handleToggleHide}));
        }, this);

        var headers = buildHeaders(this);
        var footer = buildFooter(this, paginationAttr);

        return (
            React.createElement("div", null, 
                React.createElement("table", null, 
                headers, 
                    React.createElement("tbody", null, 
                    rows
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
            var style = {"textAlign": (columnDef.format == 'number') ? "right" : "left"};
            var cellContent = columnDef.format != 'number' ? this.props.data[columnDef.colTag] : this.props.data[columnDef.colTag].toFixed(2);
            cells.push(React.createElement("td", {style: style, key: columnDef.colTag}, cellContent));
        }
        var styles = {
            "cursor": this.props.data.isDetail ? "pointer" : "inherit",
            "backgroundColor": this.props.isSelected && this.props.data.isDetail ? "#fff" : "inherit"
        };
        return (React.createElement("tr", {onClick: this.props.onSelect.bind(null, this.props.data), style: styles}, cells));
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
            React.createElement("ul", {className: "pagination pull-right"}, 
                React.createElement("li", {className: prevClass}, 
                    React.createElement("a", {href: "#", onClick: this.props.handleClick.bind(null, this.props.activeItem - 1)}, "«")
                ), 
                items, 
                React.createElement("li", {className: nextClass}, 
                    React.createElement("a", {href: "#", onClick: this.props.handleClick.bind(null, this.props.activeItem + 1)}, "»")
                )
            )
        );
    }
});

/* Virtual DOM builder helpers */

function buildHeaders(table) {
    var headerColumns = table.state.columnDefs.map(function (columnDef) {
        var styles = {
            "textAlign": (columnDef.format == 'number') ? "right" : "left"
        };
        return (

            React.createElement("th", {style: styles, key: columnDef.colTag}, 
                React.createElement("a", {className: "btn-link", onClick: table.handleSort.bind(table, columnDef)}, columnDef.text), 
                React.createElement("a", {className: "btn-link", onClick: table.handleRemove.bind(table, columnDef)}, 
                    React.createElement("span", null, 
                        React.createElement("strong", null, "-")
                    )
                )
            )
        );
    });
    headerColumns.push(React.createElement("th", {style: {"textAlign": "center"}}, 
        React.createElement("a", {className: "btn-link", onClick: table.handleAdd}, 
            React.createElement("strong", null, "+")
        )
    ));
    return (
        React.createElement("thead", null, 
            React.createElement("tr", {key: "header"}, headerColumns)
        )
    );
}
function buildFirstCellForRow(props) {
    var data = props.data, columnDef = props.columnDefs[0], toggleHide = props.toggleHide;
    var firstColTag = columnDef.colTag;

    // if sectorPath is not availiable - return a normal cell
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
 * @returns {boolean}
 */
function areAncestorsCollapsed(sectorPath, collapsedSectorPaths, collapsedSectorKeys) {
    var result = false;
    // TODO bottle necks performance in Chrome
    // true if sectorPaths is a subsector of the collapsedSectorPaths
    var max = collapsedSectorKeys.length;
    for (var i = 0; i < max; i++) {
        if (isSubSectorOf(sectorPath, collapsedSectorPaths[collapsedSectorKeys[i]]))
            result = true;
    }

    return result;
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

function generateRowKey(row, rowKey) {
    var key;
    if (rowKey)
        key = row[rowKey];
    else {
        key = generateSectorKey(row.sectorPath);
        for (var prop in row) {
            if (row.hasOwnProperty(prop))
                key += prop + "=" + row[prop] + ";";
        }
    }
    return key;
}
function generateSectorKey(sectorPath) {
    if (!sectorPath)
        return "";
    return sectorPath.join(SECTOR_SEPARATOR);
}
function prepareTableData(props) {
    // make defensive copy of the data
    // TODO maybe perform this step intelligently to improve performance
    var data = deepCopyData(props.data);

    if (props.groupBy) {
        data = groupData(data, props.groupBy, props.columnDefs);
        var sortOptions = {sectorSorter: defaultSectorSorter, detailSorter: defaultDetailSorter};
        data.sort(sorterFactory.call(this, sortOptions));
    }
    return data;
}
function deepCopyData(data) {
    return data.map(function (row) {
        var copy = {};
        for (var prop in row)
            if (row.hasOwnProperty(prop))
                copy[prop] = row[prop];
        copy.isDetail = true;
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
function getInitiallySelectedRows(selectedRows) {
    var result = {};
    selectedRows = selectedRows || [];
    for (var i = 0; i < selectedRows.length; i++)
        result[selectedRows[i]] = 1;
    return result;
}
function computePageDisplayRange(currentPage, maxDisplayedPages) {
    // total number to allocate
    var displayUnitsLeft = maxDisplayedPages;
    // allocate to the left
    var leftAllocation = Math.min(Math.floor(displayUnitsLeft / 2), currentPage - 1);
    var rightAllocation = displayUnitsLeft - leftAllocation;
    // TODO allocates less to the left when selected page approaches the end
    return {
        start: currentPage - leftAllocation - 1,
        end: currentPage + rightAllocation - 1
    }
}