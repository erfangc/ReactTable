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

;/** @jsx React.DOM */
/* Virtual DOM builder helpers */

function buildCustomMenuItems(table, columnDef) {
    var menuItems = [];
    if (columnDef.customMenuItems) {
        menuItems.push(React.createElement("div", {className: "separator"}), columnDef.customMenuItems(table,columnDef));
    }
    return menuItems;
}

function buildMenu(options) {
    var table = options.table,
        columnDef = options.columnDef,
        style = options.style,
        isFirstColumn = options.isFirstColumn, menuStyle = {};

    if (style.textAlign == 'right')
        menuStyle.right = "0%";
    else
        menuStyle.left = "0%";

    var summarizeMenuItem = React.createElement(SummarizeControl, {table: table, columnDef: columnDef});

    // construct user custom menu items
    var customMenuItems = buildCustomMenuItems(table, columnDef);

    var menuItems = [
        React.createElement("div", {className: "menu-item", onClick: table.handleSort.bind(null, columnDef, true)}, "Sort Asc"),
        React.createElement("div", {className: "menu-item", onClick: table.handleSort.bind(null, columnDef, false)}, "Sort Dsc"),
        summarizeMenuItem
    ];

    if (isFirstColumn) {
        menuItems.push(React.createElement("div", {className: "separator"}));
        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleGroupBy.bind(null, null)}, "Clear Summary"));
        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleCollapseAll.bind(null, null)}, "Collapse All"));
        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleExpandAll.bind(null)}, "Expand All"));
    } else
        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleRemove.bind(null, columnDef)}, "Remove Column"));
    menuItems.push(customMenuItems);
    return (
        React.createElement("div", {style: menuStyle, className: "rt-header-menu"}, 
            menuItems
        )
    );
}

function buildHeaders(table) {
    var columnDef = table.state.columnDefs[0], i, style = {};
    var firstColumn = (
        React.createElement("div", {className: "rt-headers-container"}, 
            React.createElement("div", {style: {textAlign: "center"}, className: "rt-header-element", key: columnDef.colTag}, 
                React.createElement("a", {className: "btn-link rt-header-anchor-text"}, columnDef.text)
            ), 
            buildMenu({table: table, columnDef: columnDef, style: {textAlign: "left"}, isFirstColumn: true})
        )
    );
    var headerColumns = [firstColumn];
    for (i = 1; i < table.state.columnDefs.length; i++) {
        columnDef = table.state.columnDefs[i];
        style = {textAlign: "center"};
        headerColumns.push(
            React.createElement("div", {className: "rt-headers-container"}, 
                React.createElement("div", {style: style, className: "rt-header-element rt-info-header", key: columnDef.colTag}, 
                    React.createElement("a", {className: "btn-link rt-header-anchor-text"}, columnDef.text)
                ), 
                buildMenu({table: table, columnDef: columnDef, style: style, isFirstColumn: false})
            )
        );
    }
    // the plus sign at the end
    headerColumns.push(
        React.createElement("span", {className: "rt-header-element rt-add-column", style: {"textAlign": "center"}}, 
            React.createElement("a", {className: "btn-link rt-plus-sign", onClick: table.handleAdd}, 
                React.createElement("strong", null, "+")
            )
        ));
    return (
        React.createElement("div", {className: "rt-headers-grand-container"}, 
            React.createElement("div", {key: "header", className: "rt-headers"}, 
                headerColumns
            )
        )
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
        "paddingLeft": (10 + identLevel * 25) + "px"
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
;/**
 * find the right sector name for the current row for the given level of row grouping
 * this method can take partition groupBy columns that are numeric in nature and bucket rows based on where they fall
 * in the partition
 * @param groupBy the column to group groupBy
 * @param row the data row to determine the sector name for
 */
function getSectorName(row, groupBy) {
    var sectorName = "", sortIndex = null;
    if (groupBy.format == "number" || groupBy.format == "currency") {
        var result = _resolveNumericSectorName(groupBy, row);
        sectorName = result.sectorName;
        sortIndex = result.sortIndex;
    } else
        sectorName = row[groupBy.colTag];
    return {sectorName: sectorName, sortIndex: sortIndex};
}

function aggregateSector(bucketResult, columnDefs, groupBy) {
    var result = {};
    for (var i = 1; i < columnDefs.length; i++)
        result[columnDefs[i].colTag] = _aggregateColumn(bucketResult, columnDefs[i], groupBy);
    return result;
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _resolveNumericSectorName(groupBy, row) {
    var sectorName = "", sortIndex = "";
    if (groupBy.groupByRange) {
        for (var i = 0; i < groupBy.groupByRange.length; i++) {
            if (row[groupBy.colTag] < groupBy.groupByRange[i]) {
                sectorName = groupBy.text + " " + (i != 0 ? groupBy.groupByRange[i - 1] : 0) + " - " + groupBy.groupByRange[i];
                sortIndex = i;
                break;
            }
        }
        if (!sectorName) {
            sectorName = groupBy.text + " " + groupBy.groupByRange[groupBy.groupByRange.length - 1] + "+";
            sortIndex = i + 1;
        }
    }
    else
        sectorName = groupBy.text;
    return {sectorName: sectorName, sortIndex: sortIndex};
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
function _resolveAggregationMethod(columnDef, groupBy) {
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

function _aggregateColumn(bucketResult, columnDef, groupBy) {
    var result;
    var aggregationMethod = _resolveAggregationMethod(columnDef, groupBy);
    switch (aggregationMethod) {
        case "sum":
            result = _straightSumAggregation({data: bucketResult, columnDef: columnDef});
            break;
        case "average":
            result = _average({data: bucketResult, columnDef: columnDef});
            break;
        case "count":
            result = _count({data: bucketResult, columnDef: columnDef});
            break;
        case "count_distinct":
            result = _countDistinct({data: bucketResult, columnDef: columnDef});
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
    return options.data.length == 0 ? 0 : sum / options.data.length;
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
    var data = options.data, columnDef = options.columnDef;
    var count = 0, i;
    for (i = 0; i < options.data.length; i++)
        if (data[i][columnDef.colTag])
            count++;
    return count;
}

function _countDistinct(options) {
    var data = options.data, columnDef = options.columnDef;
    var values = {}, i, prop;
    for (i = 0; i < options.data.length; i++)
        values[data[i][columnDef.colTag]] = 1;
    var result = 0;
    for (prop in values)
        if (values.hasOwnProperty(prop))
            result++;
    return result == 1 ? data[0][columnDef.colTag] : result;
};/** @jsx React.DOM */

/**
 * High Level TODOs
 * TODO add sortIndex to custom numerical buckets so they sort correctly
 */

/**
 * The core data is represented as a multi-node tree structure, where each node on the tree represents a 'sector'
 * and can refer to children 'sectors'
 * @author Erfang Chen
 */
var idCounter = 0;
var SECTOR_SEPARATOR = "#";

function isRowSelected(row, rowKey, selectedDetailRows, selectedSummaryRows) {
    if (rowKey == null)
        return;
    return selectedDetailRows[row[rowKey]] != null || (!row.isDetail && selectedSummaryRows[generateSectorKey(row.sectorPath)] != null);
}

var ReactTable = React.createClass({displayName: 'ReactTable',

    getInitialState: ReactTableGetInitialState,

    /* --- Called by component or child react components --- */
    handleSort: ReactTableHandleSort,
    handleAdd: ReactTableHandleAdd,
    handleRemove: ReactTableHandleRemove,
    handleToggleHide: ReactTableHandleToggleHide,
    handleGroupBy: ReactTableHandleGroupBy,
    handlePageClick: ReactTableHandlePageClick,
    handleSelect: ReactTableHandleSelect,
    handleCollapseAll: function () {
        var rootNode = this.state.rootNode;
        rootNode.collapseImmediateChildren();
        this.setState({rootNode: rootNode, currentPage: 1});
    },
    handleExpandAll: function () {
        var rootNode = this.state.rootNode;
        rootNode.expandRecursively();
        this.setState({rootNode: rootNode, currentPage: 1});
    },
    /* -------------------------------------------------- */

    toggleSelectDetailRow: function (key) {
        var selectedDetailRows = this.state.selectedDetailRows, state;
        if (selectedDetailRows[key] != null) {
            delete selectedDetailRows[key];
            state = false;
        }
        else {
            selectedDetailRows[key] = 1;
            state = true;
        }
        this.setState({
            selectedDetailRows: selectedDetailRows
        });
        return state;
    },
    toggleSelectSummaryRow: function (key) {
        var selectedSummaryRows = this.state.selectedSummaryRows, state;
        if (selectedSummaryRows[key] != null) {
            delete selectedSummaryRows[key];
            state = false;
        } else {
            selectedSummaryRows[key] = 1;
            state = true;
        }
        this.setState({
            selectedDetailRows: selectedSummaryRows
        });
        return state;
    },

    /* --- Called from outside the component --- */
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
    /* ----------------------------------------- */

    componentDidMount: function () {
        setTimeout(function () {
            adjustHeaders.call(this);
        }.bind(this));
        document.addEventListener('click', adjustHeaders.bind(this));
        window.addEventListener('resize', adjustHeaders.bind(this));
        var $node = $(this.getDOMNode());
        $node.find(".rt-scrollable").bind('scroll', function () {
            $node.find(".rt-headers").css({'overflow': 'auto'}).scrollLeft($(this).scrollLeft());
            $node.find(".rt-headers").css({'overflow': 'hidden'});
        });
        bindHeadersToMenu($node);
    },
    componentWillUnmount: function () {
        window.removeEventListener('resize', adjustHeaders.bind(this));
    },
    componentDidUpdate: function () {
        adjustHeaders.call(this);
        bindHeadersToMenu($(this.getDOMNode()));
    },
    render: function () {
        var rasterizedData = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: this.state.columnDefs[0],
            selectedDetailRows: this.state.selectedDetailRows
        });

        var paginationAttr = getPageArithmetics(this, rasterizedData);
        var rowsToDisplay = rasterizedData.slice(paginationAttr.lowerVisualBound, paginationAttr.upperVisualBound + 1);

        var rows = rowsToDisplay.map(function (row) {
            var rowKey = this.props.rowKey;
            return (React.createElement(Row, {
                data: row, 
                isSelected: isRowSelected(row, this.props.rowKey, this.state.selectedDetailRows, this.state.selectedSummaryRows), 
                onSelect: this.handleSelect, 
                key: generateRowKey(row, rowKey), 
                columnDefs: this.state.columnDefs, 
                toggleHide: this.handleToggleHide}));
        }, this);

        var headers = buildHeaders(this);
        var footer = buildFooter(this, paginationAttr);

        var containerStyle = {};
        if (this.state.height && parseInt(this.state.height) > 0)
            containerStyle.height = this.state.height;

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
};;function getInitialSelections(selectedRows, selectedSummaryRows) {
    var results = {selectedDetailRows: {}, selectedSummaryRows: {}};
    if (selectedRows != null) {
        for (var i = 0; i < selectedRows.length; i++)
            results.selectedDetailRows[selectedRows[i]] = 1;
    }
    if (selectedSummaryRows != null) {
        for (var i = 0; i < selectedSummaryRows.length; i++)
            results.selectedSummaryRows[selectedSummaryRows[i]] = 1;
    }
    return results;
}

function ReactTableGetInitialState() {
    // the holy grail of table state - describes structure of the data contained within the table
    var rootNode = createTree(this.props);
    var selections = getInitialSelections(this.props.selectedRows, this.props.selectedSummaryRows);
    return {
        rootNode: rootNode,
        uniqueId: uniqueId("table"),
        currentPage: 1,
        height: this.props.height,
        columnDefs: this.props.columnDefs,
        selectedDetailRows: selections.selectedDetailRows,
        selectedSummaryRows: selections.selectedSummaryRows
    };
}

function ReactTableHandleSelect(selectedRow) {
    var rowKey = this.props.rowKey, state;
    if (rowKey == null)
        return;
    if (selectedRow.isDetail != null & selectedRow.isDetail == true) {
        state = this.toggleSelectDetailRow(selectedRow[rowKey]);
        this.props.onSelectCallback(selectedRow, state);
    } else {
        state = this.toggleSelectSummaryRow(generateSectorKey(selectedRow.sectorPath));
        this.props.onSummarySelectCallback(selectedRow, state);
    }
}

function ReactTableHandleSort(columnDefToSortBy, sortAsc) {
    this.state.rootNode.sortChildren({
        sortFn: getSortFunction(columnDefToSortBy).bind(columnDefToSortBy),
        recursive: true,
        sortAsc: sortAsc
    });
    this.setState({rootNode: this.state.rootNode});
}

function ReactTableHandleGroupBy(columnDef, buckets) {

    if (buckets != null && buckets != "" && columnDef)
        columnDef.groupByRange = _createFloatBuckets(buckets);
    this.props.groupBy = columnDef ? [columnDef] : null;

    var rootNode = createTree(this.props);
    if (columnDef != null && columnDef.groupByRange != null && columnDef.groupByRange.length > 1)
        rootNode.sortChildren({
            sortFn: null,
            recursive: false,
            sortAsc: false,
            sortByIndex: true
        });

    this.setState({
        rootNode: rootNode,
        currentPage: 1
    });

}
function ReactTableHandleAdd() {
    if (this.props.beforeColumnAdd)
        this.props.beforeColumnAdd();
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
    summaryRow.treeNode.collapsed = !summaryRow.treeNode.collapsed;
    this.setState({rootNode: this.state.rootNode});
}

function ReactTableHandlePageClick(page, event) {
    event.preventDefault();
    this.setState({
        currentPage: page
    });
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */
function _createFloatBuckets(buckets) {
    var i = 0, stringBuckets, floatBuckets = [];
    stringBuckets = buckets.split(",");
    for (i = 0; i < stringBuckets.length; i++) {
        var floatBucket = parseFloat(stringBuckets[i]);
        if (!isNaN(floatBucket))
            floatBuckets.push(floatBucket);
        floatBuckets.sort(function (a,b) {
            return a - b;
        });
    }
    return floatBuckets;
};function genericValueBasedSorter(a, b) {
    var returnValue = 0;
    if (a[this.colTag] < b[this.colTag])
        returnValue = -1;
    else if (a[this.colTag] > b[this.colTag])
        returnValue = 1;
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
;/**
 * Transform the current props into a tree structure representing the complex state
 * @param tableProps
 * @return the root TreeNode element of the tree with aggregation
 */
function createTree(tableProps) {
    var rootNode = buildTreeSkeleton(tableProps);
    recursivelyAggregateNodes(rootNode, tableProps);
    return rootNode;
}

/**
 * Creates the data tree backed by props.data and grouped columns specified in groupBy
 * @param tableProps
 * @return {TreeNode} the root node
 */
function buildTreeSkeleton(tableProps) {
    var rootNode = new TreeNode("Grand Total", null), rawData = tableProps.data, i;
    for (i = 0; i < rawData.length; i++) {
        rootNode.appendRow(rawData[i]);
        _populateChildNodesForRow(rootNode, rawData[i], tableProps.groupBy);
    }
    return rootNode
}

/**
 * Populate an existing skeleton (represented by the root node) with summary level data
 * @param node
 * @param tableProps
 */
function recursivelyAggregateNodes(node, tableProps) {
    // aggregate the current node
    node.rowData = aggregateSector(node.ultimateChildren, tableProps.columnDefs, tableProps.groupBy);

    // for each child - aggregate those as well
    if (node.children.length > 0) {
        for (var i = 0; i < node.children.length; i++)
            recursivelyAggregateNodes(node.children[i], tableProps);
    }
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _populateChildNodesForRow(rootNode, row, groupBy) {
    var i, currentNode = rootNode;
    if (groupBy == null || groupBy.length == 0)
        return;
    for (i = 0; i < groupBy.length; i++) {
        var result = getSectorName(row, groupBy[i]);
        currentNode = currentNode.appendRowToChildren({childSectorName: result.sectorName, childRow: row, sortIndex: result.sortIndex});
    }
};// TODO consider if this sortIndex property thing is the best way to sort
/**
 * Represents a grouping of table rows with references to children that are also grouping
 * of rows
 * @constructor
 */
function TreeNode(sectorTitle, parent) {
    // accessible properties
    this.sectorTitle = sectorTitle;
    this.parent = parent;
    this.rowData = null;
    this.children = [];
    this.ultimateChildren = [];
    this.collapsed = this.parent != null ? true : false;
    this.sortIndex = null;
    // private members - TODO use closure to hide this
    this._childrenSectorNameMap = {};
}

TreeNode.prototype.appendRow = function (row) {
    this.ultimateChildren.push(row);
}

TreeNode.prototype.collapseImmediateChildren = function () {
    var i;
    for (i = 0; i < this.children.length; i++)
        this.children[i].collapsed = true;
}

TreeNode.prototype.expandRecursively = function () {
    var i;
    for (i = 0; i < this.children.length; i++) {
        this.children[i].collapsed = false;
        this.children[i].expandRecursively();
    }
}

/**
 * Appends the given row into the ultimateChildren of the specified child node of the current node
 * @param childSectorName
 * @param childRow
 * @returns the child TreeNode that the data was appended to
 */
TreeNode.prototype.appendRowToChildren = function (options) {
    var childSectorName = options.childSectorName, childRow = options.childRow, sortIndex = options.sortIndex;
    // create a new child node if one by the current sector name does not exist
    if (this._childrenSectorNameMap[childSectorName] == null) {
        var child = new TreeNode(childSectorName, this);
        child.sortIndex = sortIndex;
        this.children.push(child);
        this._childrenSectorNameMap[childSectorName] = child;
    }
    this._childrenSectorNameMap[childSectorName].appendRow(childRow);
    return this._childrenSectorNameMap[childSectorName];
}

TreeNode.prototype.getSectorPath = function () {
    var result = [this.sectorTitle], prevParent = this.parent;
    while (prevParent != null) {
        result.unshift(prevParent.sectorTitle);
        prevParent = prevParent.parent;
    }
    return result;
}

TreeNode.prototype.sortChildren = function (options) {
    var sortFn = options.sortFn, recursive = options.recursive, sortAsc = options.sortAsc,
        sortByIndex = options.sortByIndex;

    var multiplier = sortAsc == true ? 1 : -1;
    this.children.sort(function (a, b) {
        var aRow = a.rowData, bRow = b.rowData;
        // if the child.rowData contain sortIndices - sort those
        if (sortByIndex == true && _hasSortIndex(a, b))
            return a.sortIndex - b.sortIndex;
        return multiplier * sortFn(aRow, bRow);
    });
    // sort ultimate children if there are no children
    if (this.children.length == 0) {
        this.ultimateChildren.sort(function (a, b) {
            return multiplier * sortFn(a, b);
        });
    }
    if (recursive) {
        for (var i = 0; i < this.children.length; i++)
            this.children[i].sortChildren({
                sortFn: sortFn, recursive: recursive,
                sortAsc: sortAsc, sortByIndex: sortByIndex
            });
    }
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _hasSortIndex(a, b) {
    return (a.sortIndex != null && b.sortIndex != null && !isNaN(a.sortIndex) && !isNaN(a.sortIndex))
};/**
 * Converts the table state from a tree format to a array of rows for rendering
 * @param rootNode
 * @return {Array}
 */
function rasterizeTree(options) {
    var node = options.node, firstColumn = options.firstColumn;

    node = _decorateRowData(node, firstColumn);
    var flatData = [node.rowData];

    if (!node.collapsed) {
        if (node.children.length > 0)
            _rasterizeChildren(flatData, options);
        else
            _rasterizeDetailRows(node, flatData);
    }

    return flatData;
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _rasterizeChildren(flatData, options) {
    var node = options.node, firstColumn = options.firstColumn;
    var i, j, intermediateResult;
    for (i = 0; i < node.children.length; i++) {
        intermediateResult = rasterizeTree({node: node.children[i], firstColumn: firstColumn});
        for (j = 0; j < intermediateResult.length; j++)
            flatData.push(intermediateResult[j]);
    }
}

function _rasterizeDetailRows(node, flatData) {
    for (var i = 0; i < node.ultimateChildren.length; i++) {
        var detailRow = node.ultimateChildren[i];
        detailRow.sectorPath = node.rowData.sectorPath;
        detailRow.isDetail = true;
        flatData.push(detailRow);
    }
}

/**
 * enhances the `rowData` attribute of the give node with info
 * that will be useful for rendering/interactivity such as sectorPath
 */
function _decorateRowData(node, firstColumn) {
    node.rowData.sectorPath = node.getSectorPath();
    node.rowData[firstColumn.colTag] = node.sectorTitle;
    node.rowData.treeNode = node;
    return node;
}