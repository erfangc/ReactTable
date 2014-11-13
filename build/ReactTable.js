/** @jsx React.DOM */

/**
 * The core data is represented as a multi-node tree structure, where each node on the tree represents a 'sector'
 * and can refer to children 'sectors'
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
    handleGroupBy: ReactTableHandleGroupBy,
    handlePageClick: ReactTableHandlePageClick,
    handleCollapseAll: function () {
        var rootNode = this.state.rootNode;
        rootNode.collapseImmediateChildren();
        this.setState({rootNode: rootNode});
    },
    handleExpandAll: function () {
        var rootNode = this.state.rootNode;
        rootNode.expandRecursively();
        this.setState({rootNode: rootNode});
    },
    addColumn: function (columnDef, data) {
        this.state.columnDefs.push(columnDef);
        if (data) {
            this.props.data = data;
            this.state.rootNode = createTree(this.props);
        }
        this.setState({rootNode: this.state.rootNode});
    },
    replaceData: function (data) {
        this.props.data = data;
        var rootNode = createTree(this.props);
        this.setState({
            rootNode: rootNode,
            currentPage: 1
        });
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
    componentDidUpdate: function () {
        adjustHeaders.call(this);
        bindHeadersToMenu($(this.getDOMNode()));
    },
    render: function () {
        var rasterizedData = rasterizeTree(this.state.rootNode, this.props.columnDefs[0]);

        var paginationAttr = getPageArithmetics(this, rasterizedData);
        var rowsToDisplay = rasterizedData.slice(paginationAttr.lowerVisualBound, paginationAttr.upperVisualBound + 1);

        var rows = rowsToDisplay.map(function (row) {
            var rowKey = this.props.rowKey;
            return (React.createElement(Row, {
                data: row, 
                key: generateRowKey(row, rowKey), 
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
        return (React.createElement("tr", {className: classes, style: styles}, cells));
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
                    React.createElement("a", {onClick: table.handleGroupBy.bind(null, columnDef, this.state.userInputBuckets), className: "btn-link"}, "Ok")
                )
            ) : null;
        return (
            React.createElement("div", {
                onClick: subMenuAttachment == null ? table.handleGroupBy.bind(null, columnDef, null) : function () {
                }, 
                style: {"position": "relative"}, className: "menu-item menu-item-hoverable"}, 
                React.createElement("div", null, "Summarize"), 
                subMenuAttachment
            )
        );
    }
});

/*
 * ----------------------------------------------------------------------
 * Public Helpers / Utilities
 * ----------------------------------------------------------------------
 */

function generateSectorKey(sectorPath) {
    if (sectorPath == null)
        return "";
    return sectorPath.join(SECTOR_SEPARATOR);
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
        if (counter == 0 && parseInt(headerElems.first().css("border-right")) == 1) {
            width += 1;
        }
        var headerTextWidthWithPadding = currentHeader.find(".rt-header-anchor-text").width() + padding;
        if (currentHeader.width() > 0 && headerTextWidthWithPadding > currentHeader.width() + 1) {
            $(this).width(headerTextWidthWithPadding);
            $("#" + id).find("tr").find("td:eq(" + counter + ")").css("min-width", (headerTextWidthWithPadding) + "px");
            adjustedWideHeaders = true;
        }
        currentHeader.width(width);
        counter++;
    });
    if (adjustedWideHeaders) {
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

function bindHeadersToMenu(node) {
    node.find(".rt-headers-container").each(function () {
        var headerContainer = this;
        $(headerContainer).hover(function () {
            var headerPosition = $(headerContainer).position();
            if (headerPosition.left) {
                $(headerContainer).find(".rt-header-menu").css("left", headerPosition.left + "px");
            }
            if (headerPosition.right) {
                $(headerContainer).find(".rt-header-menu").css("right", headerPosition.right + "px");
            }
        });
    });
}

function uniqueId(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
};