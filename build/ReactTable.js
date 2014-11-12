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
var idCounter = 0;
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
    replaceData: function (data) {
        var state = {};
        if (data) {
            state.data = deepCopyData(data);
            this.props.data = data;
        }
        this.setState(state);
    },
    componentDidMount: function () {
        setTimeout(function () {
            adjustHeaders.call(this);
        }.bind(this));
        document.addEventListener('click', adjustHeaders.bind(this));
        window.addEventListener('resize', adjustHeaders.bind(this));
        var jqNode = $(this.getDOMNode());
        jqNode.find(".rt-scrollable").bind('scroll', function () {
            jqNode.find(".rt-headers").css({'overflow': 'auto'}).scrollLeft($(this).scrollLeft());
            jqNode.find(".rt-headers").css({'overflow': 'hidden'});
        });
        bindHeadersToMenu(jqNode);
    },
    componentWillUnmount: function () {
        window.removeEventListener('resize', adjustHeaders.bind(this));
    },
    componentDidUpdate: function(){
        adjustHeaders.call(this);
        bindHeadersToMenu($(this.getDOMNode()));
    },
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
var SummarizeControl = React.createClass({displayName: 'SummarizeControl',
    getInitialState: function () {
        return {
            userInputBuckets: ""
        }
    },
    handleChange: function (event) {
        this.setState({userInputBuckets: event.target.value});
    },
    render: function () {
        var table = this.props.table, columnDef = this.props.columnDef;
        var subMenuAttachment = columnDef.format == "number" || columnDef.format == "currency" ?
            (
                React.createElement("div", {className: "menu-item-input", onHover: true, style: {"position": "absolute", "top": "0%", "left": "100%"}}, 
                    React.createElement("label", null, "Enter Bucket(s)"), 
                    React.createElement("input", {onChange: this.handleChange, placeholder: "ex: 1,10,15"}), 
                    React.createElement("a", {onClick: table.handleGroupBy.bind(table, columnDef, this.state.userInputBuckets), className: "btn-link"}, "Ok")
                )
            ) : null;
        return (
            React.createElement("div", {
                onClick: subMenuAttachment == null ? table.handleGroupBy.bind(table, columnDef, null) : function () {
                }, 
                style: {"position": "relative"}, className: "menu-item menu-item-hoverable"}, 
                React.createElement("div", null, "Summarize"), 
                subMenuAttachment
            )
        );
    }
});

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

function adjustHeaders() {
    var id = this.state.uniqueId;
    var adjustedWideHeaders = false;
    var counter = 0;
    var headerElems = $("#" + id + " .rt-headers-container");
    var padding = parseInt(headerElems.first().find(".rt-header-element").css("padding-left"));
    padding += parseInt(headerElems.first().find(".rt-header-element").css("padding-right"));
    headerElems.each(function () {
        var currentHeader = $(this);
        var width = $('#' + id + ' .rt-table tr:first td:eq(' + counter + ')').outerWidth() - 1;
        if( counter == 0 && parseInt(headerElems.first().css("border-right")) == 1 ){
            width += 1;
        }
        var headerTextWidthWithPadding = currentHeader.find(".rt-header-anchor-text").width() + padding;
        if( currentHeader.width() > 0 && headerTextWidthWithPadding > currentHeader.width() + 1 ){
            $(this).width(headerTextWidthWithPadding);
            $("#" + id).find("tr").find("td:eq(" + counter + ")").css("min-width", (headerTextWidthWithPadding) + "px");
            adjustedWideHeaders = true;
        }
        currentHeader.width(width);
        counter++;
    });
    if( adjustedWideHeaders ){
        adjustHeaders.call(this);
    }
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

function bindHeadersToMenu(node){
    node.find(".rt-headers-container").each(function(){
        var headerContainer = this;
        $(headerContainer).hover(function(){
            var headerPosition = $(headerContainer).position();
            if( headerPosition.left ){
                $(headerContainer).find(".rt-header-menu").css("left", headerPosition.left + "px");
            }
            if( headerPosition.right ){
                $(headerContainer).find(".rt-header-menu").css("right", headerPosition.right + "px");
            }
        });
    });
}

function uniqueId(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
};
