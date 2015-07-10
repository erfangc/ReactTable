
/**
 * Construct Look and Feel object with instructions on how to display cell content
 * @param columnDef
 * @returns {{multiplier: number, roundTo: number, unit: string, alignment: string}}
 */
function buildLAFConfigObject(columnDef) {
    var formatInstructions = columnDef.formatInstructions;
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
 * Compute cell alignment based on row attribute and column definition that intersects at a given cell
 * @param alignment the default alignment
 * @param row the row component of the cell of interest
 * @param columnDef the column definition associated with the cell of interest
 * @returns {*}
 */
function computeCellAlignment(alignment, row, columnDef) {
    // force right alignment for summary level numbers
    if (!row.isDetail && !isNaN(row[columnDef.colTag]))
        return "right";

    // default alignment
    return alignment;
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
    results.styles.textAlign = computeCellAlignment(formatConfig.alignment, row, columnDef);
    results.styles.width = columnDef.text.length + "em";
    results.value = value;

    // show zero as blank
    if (formatConfig.showZeroAsBlank && results.value == 0)
        results.value = "";

    return results;
}
/**
 * return default column alignment given data type
 * @param columnDef
 * @returns {string}
 */
function getColumnAlignment(columnDef) {
    return (columnDef.format == "number" || columnDef.format == "currency") ? "right" : "left"
}

/**
 * takes a cell value and apply format instruction as needed
 * @param value
 * @param columnDef
 * @param formatConfig
 * @returns {*}
 */
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
/**
 *
 * @param x
 * @returns {string}
 */
function applyThousandSeparator(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

;/** @jsx React.DOM */
/* Virtual DOM builder helpers */

/**
 * Extracts the react components that constitute menu items from the current columnDef for the given table
 * if the given columnDef has customMenuFactory method defined, the factory method will be called to create
 * menu items. Otherwise an array property with the name customMenuItems on columnDef will be searched
 * @param table
 * @param columnDef
 * @returns {Array}
 */
function buildCustomMenuItems(table, columnDef) {
    if (columnDef.customMenuFactory && typeof columnDef.customMenuFactory === 'function')
        return columnDef.customMenuFactory(columnDef, table);
    else if (columnDef.customMenuItems && Array.isArray(columnDef.customMenuItems))
        return columnDef.customMenuItems;
}

function buildMenu(options) {
    var table = options.table,
        columnDef = options.columnDef,
        style = options.style,
        isFirstColumn = options.isFirstColumn, menuStyle = {};

    const subMenuStyles = {
        "top": "-20%",
        "left": "100%",
        "padding": "5px"
    };

    if (style.textAlign == 'right')
        menuStyle.right = "0%";
    else
        menuStyle.left = "0%";

    // construct user custom menu items
    var menuItems = [];
    var availableDefaultMenuItems = {
        sort: [
            React.createElement(SubMenu, {onMenuClick: table.handleSetSort.bind(null,columnDef,null), 
                     menuItem: React.createElement("span", null, React.createElement("i", {className: "fa fa-sort"}), " Sort"), subMenu: 
                React.createElement("div", {className: "rt-header-menu", style: subMenuStyles}, 
                    React.createElement("div", {className: "menu-item", onClick: table.handleSetSort.bind(null, columnDef, 'asc')}, 
                        React.createElement("i", {className: "fa fa-sort-alpha-asc"}), " Asc"
                    ), 
                    React.createElement("div", {className: "menu-item", onClick: table.handleSetSort.bind(null, columnDef, 'desc')}, 
                        React.createElement("i", {className: "fa fa-sort-alpha-desc"}), " Desc"
                    ), 
                    React.createElement("div", {className: "separator"}), 
                    React.createElement("div", {className: "menu-item", onClick: table.handleAddSort.bind(null, columnDef, 'asc')}, 
                        React.createElement("i", {className: "fa fa-plus"}), React.createElement("i", {className: "fa fa-sort-alpha-asc"}), " Add Asc"
                    ), 
                    React.createElement("div", {className: "menu-item", onClick: table.handleAddSort.bind(null, columnDef, 'desc')}, 
                        React.createElement("i", {className: "fa fa-plus"}), React.createElement("i", {className: "fa fa-sort-alpha-desc"}), " Add Desc"
                    ), 
                    React.createElement("div", {className: "separator"}), 
                    React.createElement("div", {className: "menu-item", onClick: table.clearSort}, React.createElement("i", {className: "fa fa-ban"}), " Clear All Sort")
                )}
            )
        ],
        filter: [
            React.createElement("div", {className: "menu-item", onClick: table.handleClearFilter.bind(null, columnDef)}, "Clear Filter"),
            React.createElement("div", {className: "menu-item", onClick: table.handleClearAllFilters}, "Clear All Filters"),
            React.createElement("div", {className: "separator"})
        ],
        summarize: [
            React.createElement(SubMenu, {onMenuClick: table.handleSubtotalBy.bind(null, columnDef, null), 
                     menuItem: React.createElement("span", null, React.createElement("i", {className: "fa fa-list-ul"}), " Subtotal"), 
                     subMenu: 
                React.createElement("div", {className: "rt-header-menu", style: subMenuStyles}, 
                   React.createElement(SubtotalControl, {table: table, columnDef: columnDef}), 
                    React.createElement("div", {className: "menu-item", onClick: table.handleClearSubtotal}, React.createElement("i", {className: "fa fa-ban"}), " Clear All Subtotal")
                )
            })
        ],
        remove: [
            React.createElement("div", {className: "menu-item", onClick: table.handleRemove.bind(null, columnDef)}, React.createElement("i", {
                className: "fa fa-remove"}), " Remove Column")
        ]
    };
    if (table.props.defaultMenuItems) {
        for (var i = 0; i < table.props.defaultMenuItems.length; i++) {
            var itemName = table.props.defaultMenuItems[i];
            addMenuItems(menuItems, availableDefaultMenuItems[itemName]);
        }
    } else {
        addMenuItems(menuItems, availableDefaultMenuItems.sort);
        if (!(table.props.filtering && table.props.filtering.disable))
            addMenuItems(menuItems, availableDefaultMenuItems.filter);
        addMenuItems(menuItems, availableDefaultMenuItems.summarize);
        if (!isFirstColumn)
            addMenuItems(menuItems, availableDefaultMenuItems.remove);
    }

    var customMenuItems = buildCustomMenuItems(table, columnDef);
    menuItems.push(customMenuItems);

    if (isFirstColumn) {
        menuItems.push(React.createElement("div", {className: "separator"}));
        if (!table.props.disableExporting) {
            menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleDownload.bind(null, "excel")}, React.createElement("i", {
                className: "fa fa-file-excel-o"}), " Download as XLS"));
            menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleDownload.bind(null, "pdf")}, React.createElement("i", {
                className: "fa fa-file-pdf-o"}), " Download as PDF"));
        }

        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleCollapseAll}, "Collapse" + ' ' +
            "All"));
        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleExpandAll}, "Expand All"));
    }

    return (
        React.createElement("div", {style: menuStyle, className: "rt-header-menu"}, 
            menuItems
        )
    );
}

function addMenuItems(master, children) {
    for (var j = 0; j < children.length; j++)
        master.push(children[j])
}

function toggleFilterBox(table, colTag) {
    var fip = table.state.filterInPlace;
    fip[colTag] = !fip[colTag];
    table.setState({
        filterInPlace: fip
    });
    setTimeout(function () {
        $("input.rt-" + colTag + "-filter-input").focus();
    });
}

function pressedKey(table, colTag, e) {
    const ESCAPE = 27;
    if (table.state.filterInPlace[colTag] && e.keyCode == ESCAPE) {
        table.state.filterInPlace[colTag] = false;
        table.setState({
            filterInPlace: table.state.filterInPlace
        });
    }
}
/**
 * creates the header row of the table
 * TODO too long needs refactoring big time I am not kidding
 * @param table
 * @returns {XML}
 */
function buildHeaders(table) {
    var columnDef = table.state.columnDefs[0], i, style = {};
    /**
     * sortDef tracks whether the current column is being sorted
     */
    var sortDef = findDefByColTag(table.state.sortBy, columnDef.colTag);
    var sortIcon = null;
    if (sortDef)
        sortIcon =
            React.createElement("i", {className: "fa fa-sort-"+sortDef.sortType});
    var textClasses = "btn-link rt-header-anchor-text" + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? " rt-hide" : "");
    var numericPanelClasses = "rt-numeric-filter-container" + (columnDef.format === "number" && table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide");
    var ss = {
        width: "100%",
        height: "13px",
        padding: "0"
    };
    var firstColumn = (
        React.createElement("div", {className: "rt-headers-container"}, 
            React.createElement("div", {style: {textAlign: "center"}, onDoubleClick: table.handleSetSort.bind(null,columnDef, null), 
                 className: "rt-header-element", key: columnDef.colTag}, 
                React.createElement("a", {href: "#", className: textClasses, 
                   onClick: table.props.filtering && table.props.filtering.disable ? null : toggleFilterBox.bind(null, table, columnDef.colTag)}, 
                    buildFirstColumnLabel(table).join("/")
                ), 
                sortIcon, 
                React.createElement("input", {style: ss, 
                       className: ("rt-" + columnDef.colTag + "-filter-input rt-filter-input") + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? "" : " rt-hide"), 
                       onChange: table.handleColumnFilter.bind(null, columnDef), 
                       onKeyDown: pressedKey.bind(null, table, columnDef.colTag)})
            ), 
            React.createElement("div", {className: numericPanelClasses}, 
                React.createElement(NumericFilterPanel, null)
            ), 
            table.state.filterInPlace[columnDef.colTag] ? null : buildMenu({
                table: table,
                columnDef: columnDef,
                style: {textAlign: "left"},
                isFirstColumn: true
            })
        )
    );
    var headerColumns = [firstColumn];
    for (i = 1; i < table.state.columnDefs.length; i++) {
        columnDef = table.state.columnDefs[i];
        sortDef = findDefByColTag(table.state.sortBy, columnDef.colTag);
        sortIcon = null;
        if (sortDef)
            sortIcon =
                React.createElement("i", {className: "fa fa-sort-"+sortDef.sortType});

        style = {textAlign: "center"};
        numericPanelClasses = "rt-numeric-filter-container" + (columnDef.format === "number" && table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide");
        textClasses = "btn-link rt-header-anchor-text" + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? " rt-hide" : "");
        headerColumns.push(
            React.createElement("div", {className: "rt-headers-container"}, 
                React.createElement("div", {onDoubleClick: table.handleSetSort.bind(null,columnDef, null), style: style, 
                     className: "rt-header-element rt-info-header", key: columnDef.colTag}, 
                    React.createElement("a", {href: "#", className: textClasses, 
                       onClick: table.props.filtering && table.props.filtering.disable ? null : toggleFilterBox.bind(null, table, columnDef.colTag)}, 
                        React.createElement("span", null, columnDef.text, " ", columnDef.isLoading ?
                            React.createElement("i", {className: "fa fa-spinner fa-spin"}) : null)
                    ), 
                    sortIcon, 
                    React.createElement("input", {style: ss, 
                           className: ("rt-" + columnDef.colTag + "-filter-input rt-filter-input") + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? "" : " rt-hide"), 
                           onChange: table.handleColumnFilter.bind(null, columnDef), 
                           onKeyDown: pressedKey.bind(null, table, columnDef.colTag)})
                ), 
                React.createElement("div", {className: numericPanelClasses}, 
                    React.createElement(NumericFilterPanel, {clearFilter: table.handleClearFilter, 
                                        addFilter: table.handleColumnFilter, 
                                        colDef: columnDef, 
                                        currentFilters: table.state.currentFilters})
                ), 
                table.state.filterInPlace[columnDef.colTag] ? null : buildMenu({
                    table: table,
                    columnDef: columnDef,
                    style: style,
                    isFirstColumn: false
                })
            )
        );
    }

    var corner;
    var classString = "btn-link rt-plus-sign";
    if (!table.props.disableAddColumnIcon && table.props.cornerIcon) {
        corner = React.createElement("img", {src: table.props.cornerIcon});
        classString = "btn-link rt-corner-image";
    }


    // the plus sign at the end
    headerColumns.push(
        React.createElement("span", {className: "rt-header-element rt-add-column", style: {"textAlign": "center"}}, 
            React.createElement("a", {className: classString, onClick: table.props.disableAddColumn ? null : table.handleAdd}, 
                React.createElement("strong", null, corner ? corner : (table.props.disableAddColumn ? '' : React.createElement("i", {className: "fa fa-plus"})))
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
/**
 * create the first cell for each row, append the proper ident level based on the cell's depth in the subtotaling tree
 * @returns {*}
 */
function buildFirstCellForRow() {
    var props = this.props;
    var data = props.data, columnDef = props.columnDefs[0], toggleHide = props.toggleHide;
    var firstColTag = columnDef.colTag, userDefinedElement, result;

    // if sectorPath is not available - return a normal cell
    if (!data.sectorPath)
        return React.createElement("td", {key: firstColTag, 
                   onDoubleClick: this.props.filtering && this.props.filtering.doubleClickCell ?
                     this.props.handleColumnFilter(null, columnDef) : null}, 
            data[firstColTag]
        );

    // styling & ident
    var identLevel = !data.isDetail ? data.sectorPath.length - 1 : data.sectorPath.length;
    var firstCellStyle = {
        "paddingLeft": (10 + identLevel * 25) + "px"
    };

    userDefinedElement = (!data.isDetail && columnDef.summaryTemplate) ? columnDef.summaryTemplate.call(null, data) : null;

    if (data.isDetail)
        result = React.createElement("td", {style: firstCellStyle, key: firstColTag, 
                     onDoubleClick: this.props.filtering && this.props.filtering.doubleClickCell ?
                this.props.handleColumnFilter(null, columnDef) : null}, 
            data[firstColTag]);
    else {
        result =
            (
                React.createElement("td", {style: firstCellStyle, key: firstColTag}, 
                    React.createElement("a", {onClick: toggleHide.bind(null, data), className: "btn-link rt-expansion-link"}, 
                        data.treeNode.collapsed ? React.createElement("i", {className: "fa fa-plus"}) : React.createElement("i", {className: "fa fa-minus"})
                    ), 
                    "  ", 
                    React.createElement("strong", null, data[firstColTag]), 
                    userDefinedElement
                )
            );
    }
    return result;
}

function buildFooter(table, paginationAttr) {
    return table.props.columnDefs.length > 0 && !table.props.disablePagination ?
        (React.createElement(PageNavigator, {
            items: paginationAttr.allPages.slice(paginationAttr.pageDisplayRange.start, paginationAttr.pageDisplayRange.end), 
            activeItem: table.state.currentPage, 
            numPages: paginationAttr.pageEnd, 
            handleClick: table.handlePageClick})) : null;
}
;/**
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
    for (var i = 1; i < columnDefs.length; i++)
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
    var result = "";
    if (columnDef.aggregationMethod) {
        result = columnDef.aggregationMethod;
    }
    // resolve conditional aggregation method
    if (columnDef.conditionalAggregationMethod && subtotalBy && subtotalBy.length == 1) {
        var subtotalByColTag = subtotalBy[0].colTag;
        if (columnDef.conditionalAggregationMethod[subtotalByColTag])
            result = columnDef.conditionalAggregationMethod[subtotalByColTag];
    }
    return result.toLowerCase();
}

function aggregateColumn(partitionResult, columnDef, subtotalBy) {
    var result;
    var aggregationMethod = resolveAggregationMethod(columnDef, subtotalBy);
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
    var data = options.data, columnDef = options.columnDef;
    return options.data.length || 0;
}

function _countDistinct(options) {
    var data = options.data, columnDef = options.columnDef;
    var values = {}, i, prop;
    for (i = 0; i < options.data.length; i++) {
        if (!data[i][columnDef.colTag]) continue;
        values[data[i][columnDef.colTag]] = 1;
    }
    var result = 0;
    for (prop in values)
        if (values.hasOwnProperty(prop))
            result++;
    return result == 1 ? data[0][columnDef.colTag] : result;
}

function _countAndDistinct(options) {
    var count = _count(options);
    var distinctCount = _countDistinct(options);
    return count == 1 ? distinctCount : "(" + distinctCount + "/" + count + ")"
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
};function exportToExcel(data, filename, table){
    var excel="<table><tr>";
    // Header
    $.each(data.headers, function(i, value) {
        excel += "<td>" + parseString(value)+ "</td>";
    });

    excel += '</tr>';

    // Row Vs Column
    var rowCount=1;
    $.each(data.data, function(i, value) {
        if( value.length > 0 && typeof value[0].match === "function" && value[0].match("Grand Total") ) {
            rowCount++;
            return;
        }
        excel += "<tr>";
        var colCount=0;

        // TODO Chris the names here as needs to be refactored
        $.each(value, function(j, value2) {
            if(table.state.columnDefs[j] && table.state.columnDefs[j].format && table.state.columnDefs[j].format.toLowerCase() === "date" ){
                if (typeof value2 === "number") // if displayContent is a number, we assume displayContent is in milliseconds
                    value2 = new Date(value2).toLocaleDateString();

            }
            excel += "<td>"+parseString(value2)+"</td>";
            colCount++;
        });
        rowCount++;
        excel += '</tr>';
    });
    excel += '</table>';

    var excelFile = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:"+'excel'+"' xmlns='http://www.w3.org/TR/REC-html40'>";
    excelFile += "<head>";
    excelFile += "<!--[if gte mso 9]>";
    excelFile += "<xml>";
    excelFile += "<x:ExcelWorkbook>";
    excelFile += "<x:ExcelWorksheets>";
    excelFile += "<x:ExcelWorksheet>";
    excelFile += "<x:Name>";
    excelFile += "{worksheet}";
    excelFile += "</x:Name>";
    excelFile += "<x:WorksheetOptions>";
    excelFile += "<x:DisplayGridlines/>";
    excelFile += "</x:WorksheetOptions>";
    excelFile += "</x:ExcelWorksheet>";
    excelFile += "</x:ExcelWorksheets>";
    excelFile += "</x:ExcelWorkbook>";
    excelFile += "</xml>";
    excelFile += "<![endif]-->";
    excelFile += "</head>";
    excelFile += "<body>";
    excelFile += excel;
    excelFile += "</body>";
    excelFile += "</html>";


    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");

    // If Internet Explorer
    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)){

        var tempFrame = $('<iframe></iframe>')
            .css("display", "none")
            .attr("id", "ieExcelFrame")
            .appendTo("body");

        ieExcelFrame.document.open("txt/html","replace");
        ieExcelFrame.document.write(excelFile);
        ieExcelFrame.document.close();
        ieExcelFrame.focus();
        ieExcelFrame.document.execCommand("SaveAs",true, filename + ".xls");

        tempFrame.remove();
    }
    else{          //other browsers
        var base64data = $.base64.encode(excelFile);
        var blob = b64toBlob(base64data, "application/vnd.ms-excel");
        var blobUrl = URL.createObjectURL(blob);
        $("<a></a>").attr("download", filename)
                    .attr("href", blobUrl)
                    .append("<div id='download-me-now'></div>")
                    .appendTo("body");
        $("#download-me-now").click().remove();
    }
}

function b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
}

function exportToPDF(data, filename, table){

    var defaults = {
        separator: ',',
        ignoreColumn: [],
        tableName:'yourTableName',
        pdfFontSize:6,
        pdfLeftMargin:20
    };

    var doc = new jsPDF('l','pt', 'letter', true);
    var widths = [];
    // Header
    var startColPosition=defaults.pdfLeftMargin;

    $.each(data.headers, function(index, value) {
        var currentLength = parseString(value, true).length * 4.5;
        if( !widths[index] || widths[index] < currentLength )
            widths[index] = Math.max(30,currentLength);
    });

    $.each(data.data, function(i, value) {
        if( value.length > 0 && typeof value[0].match === "function" && value[0].match("Grand Total") ) {
            return;
        }
        $.each(value, function(index, value2) {
            var currentLength = parseString(value2, true).length * 4.5;
            if( !widths[index] || widths[index] < currentLength )
                widths[index] = Math.max(30,currentLength);
        });
    });

    var sumOfColumnWidths = widths.reduce(function(prev,current){ return prev + current; });
    if( sumOfColumnWidths > 752 ){
        var multiplier = 752/sumOfColumnWidths;
        doc.setFontSize(multiplier * defaults.pdfFontSize);
        for( var i=0; i<widths.length; i++ ){
            widths[i] = widths[i] * multiplier;
        }
    }
    else{
        doc.setFontSize(defaults.pdfFontSize);
    }


    $.each(data.headers, function(index, value) {
        var colPosition = widths.reduce(function(prev,current,idx){
            return idx < index ? prev + current : prev;
        }, startColPosition);
        doc.text(colPosition,20, parseString(value, true));
    });

    // Row Vs Column
    var startRowPosition = 20; var page =1;var rowPosition=0;
    var rowCalc = 1;

    $.each(data.data, function(i, value) {
        if( value.length > 0 && typeof value[0].match === "function" && value[0].match("Grand Total") ) {
            return;
        }
        rowCalc++;

        if (rowCalc % 50 == 0){
            doc.addPage();
            page++;
            rowCalc = 1;
        }
        rowPosition=(startRowPosition + (rowCalc * 10));

        $.each(value, function(index, value2) {
            var colPosition = widths.reduce(function(prev,current,idx){
                return idx < index ? prev + current : prev;
            }, startColPosition);
            if( table.state.columnDefs[index].format && table.state.columnDefs[index].format.toLowerCase() === "date" ){
                if (typeof value2 === "number") // if displayContent is a number, we assume displayContent is in milliseconds
                    value2 = new Date(value2).toLocaleDateString();

            }
            doc.text(colPosition,rowPosition, parseString(value2, true));
        });
    });

    // Output as Data URI
    doc.output('save', filename + '.pdf');

}

function parseString(data, isPdf){
    if( typeof data !== "string" ) {
        if ( data && data.toString )
            data = data.toString();
        else
            return "";
    }

    var content_data = data.trim();

    content_data = content_data.replace(/[^\x00-\x7F]/g, "");
    if( isPdf )
        content_data = content_data.substr(0,20);

    //if(defaults.escape == 'true'){
    //	content_data = escape(content_data);
    //}



    return content_data;
};/**
 * a addon menu item that displays additional text on hover, useful for displaying column definitions
 */
const InfoBox = React.createClass({displayName: "InfoBox",
        propTypes: {
            title: React.PropTypes.string.isRequired,
            text: React.PropTypes.string.isRequired,
            styles: React.PropTypes.object
        },
        getInitialState: function () {
            return {
                showInfoBox: false
            };
        },
        getDefaultProps: function () {
            return {
                styles: {
                    "position": "absolute",
                    "whiteSpace": "normal",
                    "top": "150%",
                    "right": "0",
                    "fontSize": "10px",
                    "textShadow": "none",
                    "backgroundColor": "#f0f3f5",
                    "color": "#4a5564",
                    "width": "250px",
                    "padding": "10px",
                    "borderRadius": "1px"
                }
            }
        },
        showInfoBox: function () {
            // determine whether we should show the info box left or right facing, depending on its position in the headers
            this.setState({showInfoBox: true});
        },
        hideInfoBox: function () {
            this.setState({showInfoBox: false});
        },
        render: function () {
            var infoBox = this.state.showInfoBox ?
                React.createElement("div", {style: this.props.styles}, 
                    React.createElement("div", null, this.props.text)
                ) : null;

            return (
                React.createElement("div", {style: {"position": "relative"}, className: "menu-item", onMouseEnter: this.showInfoBox, 
                     onMouseLeave: this.hideInfoBox}, 
                    React.createElement("div", null, this.props.title), 
                    infoBox
                )
            );
        }
    }
);

/**
 * This component represent a sort menu item that expands into a sub-menu that allow the user to control table sorting
 */
const SubMenu = React.createClass({displayName: "SubMenu",
    propTypes: {
        subMenu: React.PropTypes.object,
        menuItem: React.PropTypes.object,
        onMenuClick: React.PropTypes.func
    },
    getDefaultProps: function () {
        return {
            onMenuClick: function () {}
        }
    },
    getInitialState: function () {
        return {
            showSubMenu: false
        };
    },
    showSubMenu: function () {
        // determine whether we should show the info box left or right facing, depending on its position in the headers
        this.setState({showSubMenu: true});
    },
    hideSubMenu: function () {
        this.setState({showSubMenu: false});
    },
    render: function () {
        const subMenu = this.state.showSubMenu ?
            this.props.subMenu : null;

        return (
            React.createElement("div", {onClick: this.props.onMenuClick, className: "menu-item", style: {position:"relative"}, 
                 onMouseEnter: this.showSubMenu, 
                 onMouseLeave: this.hideSubMenu}, 
                this.props.menuItem, 
                subMenu
            ));
    }
});;/** @jsx React.DOM */

var NumericFilterPanel = React.createClass({
    displayName: 'NumericFilterPanel',
    getInitialState: function () {
        return{
            entry0: {
                checked: true,
                dropdown: "gt",
                input: ""
            },
            entry1: {
                checked: false,
                dropdown: "gt",
                input: ""
            }
        };
    },
    handleChange: function(event) {
        var domNode = $(this.getDOMNode());
        var boxes = domNode.find(".rt-numeric-checkbox");
        this.props.clearFilter(this.props.colDef);
        var filterData = [];
        for( var i=0; i<boxes.length; i++ ){
            var tempHash = {};
            var inputBoxData = domNode.find(".rt-numeric-input").eq(i).val();
            var dropdownBoxData = domNode.find(".rt-numeric-dropdown").eq(i).find(":selected").val();
            tempHash[dropdownBoxData] = inputBoxData;

            if( boxes.eq(i).is(":checked") ) {
                filterData.push(tempHash);
                this.state["entry" + i].checked = true;
            }
            else{
                this.state["entry" + i].checked = false;
            }
            this.state["entry" + i].dropdown = dropdownBoxData;
            this.state["entry" + i].input = inputBoxData;
        }
        this.props.addFilter(this.props.colDef, filterData);
        this.setState({entry0: this.state.entry0, entry1: this.state.entry1});
    },
    changeCheckbox: function(e){
        var entryName = "entry" + $(e.target).data("order");
        this.state[entryName].checked = e.target.checked;
        this.setState({entryName: this.state[entryName]});
    },
    render: function () {
        var inputStyle = {
            "width": "70px"
        };
        return (
            React.createElement("div", null, 
                React.createElement("input", {"data-order": "0", className: "rt-numeric-checkbox", type: "checkbox", checked: this.state.entry0.checked, onChange: this.changeCheckbox}), 
                React.createElement("select", {"data-order": "0", className: "rt-numeric-dropdown"}, 
                    React.createElement("option", {value: "gt"}, "Greater Than"), 
                    React.createElement("option", {value: "lt"}, "Less Than"), 
                    React.createElement("option", {value: "eq"}, "Equals")
                ), 
                React.createElement("input", {"data-order": "0", className: "rt-numeric-input", style: inputStyle, type: "number"}), 

                React.createElement("br", null), 

                React.createElement("input", {"data-order": "1", className: "rt-numeric-checkbox", type: "checkbox", checked: this.state.entry1.checked, onChange: this.changeCheckbox}), 
                React.createElement("select", {"data-order": "1", className: "rt-numeric-dropdown"}, 
                    React.createElement("option", {value: "gt"}, "Greater Than"), 
                    React.createElement("option", {value: "lt"}, "Less Than"), 
                    React.createElement("option", {value: "eq"}, "Equals")
                ), 
                React.createElement("input", {"data-order": "1", className: "rt-numeric-input", style: inputStyle, type: "number"}), 

                React.createElement("br", null), 

                React.createElement("button", {onClick: this.handleChange}, "Submit")
            )
        );
    }
});;/** @jsx React.DOM */

/**
 * The core data is represented as a multi-node tree structure, where each node on the tree represents a 'sector'
 * and can refer to children 'sectors'.
 * @author Erfang Chen
 */
var idCounter = 0;

/**
 * The main component class. Creates an table element with the corresponding sub-components
 * Please make sure to use caution when adding to props or states. Per react.js best-practices, we should avoid
 * storing states where possible, and props should be documented in 'propTypes', see below, for validation purposes.
 */
var ReactTable = React.createClass({displayName: "ReactTable",

    getInitialState: ReactTableGetInitialState,
    propTypes: {
        /**
         * core props
         */
        data: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
        columnDefs: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
        subtotalBy: React.PropTypes.arrayOf(React.PropTypes.object),
        sortBy: React.PropTypes.arrayOf(React.PropTypes.object),
        selectedRows: React.PropTypes.arrayOf(React.PropTypes.string),
        rowKey: React.PropTypes.string,
        /**
         * callbacks that the table accept
         */
        afterColumnRemove: React.PropTypes.func,
        beforeColumnAdd: React.PropTypes.func,
        onSelectCallback: React.PropTypes.func,
        onSummarySelectCallback: React.PropTypes.func,
        onRightClick: React.PropTypes.func,
        /**
         * props to selectively disable table features
         */
        disableAddColumn: React.PropTypes.bool,
        disablePagination: React.PropTypes.bool,
        disableInfiniteScrolling: React.PropTypes.bool,
        disableExporting: React.PropTypes.bool,
        disableGrandTotal: React.PropTypes.bool,
        /**
         * misc props
         */
        pageSize: React.PropTypes.number
    },
    getDefaultProps: function () {
        return {
            pageSize: 50,
            extraStyle: {
                "cursor": "pointer"
            },
            subtotalBy: [],
            sortBy: []
        };
    },
    /* --- Called by component or child react components --- */
    /**
     * Handles resetting all current sorting and replacing sort order
     * by the columnDef specified
     * @param columnDef
     */
    handleSetSort: function (columnDef, sortType, event) {
        event.stopPropagation();
        const sortBy = this.state.sortBy;
        const existing = findDefByColTag(sortBy, columnDef.colTag);
        sortType = sortType || (existing && existing.sortType === 'asc' ? 'desc' : 'asc');
        while (sortBy.length > 0)
            sortBy.pop();
        sortBy.push({colTag: columnDef.colTag, sortType: sortType});
        var newState = {
            sortBy: sortBy
        };
        this.state.rootNode.sortNodes(convertSortByToFuncs(this.state.columnDefs, sortBy));
        newState.rootNode = this.state.rootNode;
        this.setState(newState);

    },
    handleAddSort: function (columnDef, sortType, event) {
        event.stopPropagation();
        const sortBy = this.state.sortBy;
        /**
         * if the current column is already part of the sort, then replace its sort type
         * otherwise add it to the list of columns that needs to be sorted
         */
        var colPosition = findPositionByColTag(sortBy, columnDef.colTag);
        if (colPosition != -1)
            sortBy[colPosition].sortType = sortType;
        else
            sortBy.push({colTag: columnDef.colTag, sortType: sortType});

        var newState = {
            sortBy: sortBy
        };
        this.state.rootNode.sortNodes(convertSortByToFuncs(this.state.columnDefs, sortBy));
        newState.rootNode = this.state.rootNode;
        this.setState(newState);
    },
    /**
     * clearing sort always creates a new rootNode
     * so all sub-state information in the rootNode will be lost
     */
    clearSort: function (event) {
        event.stopPropagation();
        const newState = this.state;
        /**
         * do not set subtotalBy or sortBy to blank array - simply pop all elements off, so it won't disrupt external reference
         */
        const sortBy = this.state.sortBy;
        while (sortBy.length > 0)
            sortBy.pop();
        newState.sortBy = sortBy;
        newState.rootNode = createNewRootNode(this.props, this.state);
        this.setState(newState);
    },
    handleColumnFilter: ReactTableHandleColumnFilter,
    handleClearFilter: ReactTableHandleRemoveFilter,
    handleClearAllFilters: ReactTableHandleRemoveAllFilters,
    handleAdd: ReactTableHandleAdd,
    handleRemove: ReactTableHandleRemove,
    handleToggleHide: ReactTableHandleToggleHide,
    handleSubtotalBy: ReactTableHandleSubtotalBy,
    handleClearSubtotal: ReactTableHandleClearSubtotal,
    handlePageClick: ReactTableHandlePageClick,
    handleSelect: ReactTableHandleSelect,
    handleCollapseAll: function () {
        this.state.rootNode.foldSubTree();
        this.state.rootNode.collapseImmediateChildren();
        this.setState({
            currentPage: 1,
            lowerVisualBound: 0,
            upperVisualBound: this.props.pageSize
        });
    },
    handleExpandAll: function () {
        this.state.rootNode.expandRecursively();
        this.setState({
            currentPage: 1,
            lowerVisualBound: 0,
            upperVisualBound: this.props.pageSize
        });
    },
    handleDownload: function (type) {
        var reactTableData = this;

        var objToExport = {headers: [], data: []};

        var firstColumn = this.state.columnDefs[0];

        var rasterizedData = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: firstColumn,
            selectedDetailRows: this.state.selectedDetailRows
        });

        $.each(this.props.columnDefs, function () {
            objToExport.headers.push(this.text);
        });

        $.each(rasterizedData, function () {
            if (this[firstColumn.colTag] === "Grand Total")
                return;
            var row = [];
            var datum = this;
            $.each(reactTableData.props.columnDefs, function () {
                row.push(buildCellLookAndFeel(this, datum).value);
            });
            objToExport.data.push(row);
        });

        if (type === "excel")
            exportToExcel(objToExport, this.props.filenameToSaveAs ? this.props.filenameToSaveAs : "table-export", this);
        else if (type === "pdf")
            exportToPDF(objToExport, this.props.filenameToSaveAs ? this.props.filenameToSaveAs : "table-export", this);
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
            selectedSummaryRows: selectedSummaryRows
        });
        return state;
    },
    forceSort: function () {
        this.state.rootNode.sortNodes(convertSortByToFuncs(this.state.columnDefs, this.state.sortBy));
        this.setState({});
    },
    getDetailToggleState: function (key) {
        return this.state.selectedDetailRows[key] && true;
    },
    clearAllRowSelections: function () {
        this.setState({
            selectedDetailRows: {},
            selectedSummaryRows: {}
        });
    },
    getRowSelectionStates: function () {
        return {
            selectedDetailRows: this.state.selectedDetailRows,
            selectedSummaryRows: this.state.selectedSummaryRows
        };
    },
    /* --- Called from outside the component --- */
    /**
     * Add a new column to the table. This assumes the data props has been updated to reflect the values referred to by
     * the new column you are about to add.
     *
     * @param columnDef the column definition to add
     * @param idx the position in the columnDefs state to add it to, if not specified, will just append
     */
    addColumn: function (columnDef, idx) {
        var columnDefs = this.state.columnDefs;
        // do nothing if columnDef already exist
        if (!columnDef.colTag || findPositionByColTag(columnDefs, columnDef.colTag) != -1)
            return;
        if (idx)
            columnDefs.splice(idx + 1, 0, columnDef);
        else
            columnDefs.push(columnDef)
        this.setState({
            columnDefs: columnDefs
        });
    },
    handleScroll: function (e) {
        const $target = $(e.target);
        const scrollTop = $target.scrollTop();
        const height = $target.height();
        const totalHeight = $target.find("tbody").height();
        const avgRowHeight = totalHeight / $target.find("tbody > tr").length;
        /**
         * always update lastScrollTop on scroll event - it helps us determine
         * whether the next scroll event is up or down
         */
        var newState = {lastScrollTop: scrollTop};
        /**
         * we determine the correct display boundaries by keeping the distance between lower and upper visual bound
         * to some constant multiple of pageSize
         */
        const rowDisplayBoundry = 2 * this.props.pageSize;
        if (scrollTop < this.state.lastScrollTop && scrollTop <= 0) {
            // up scroll limit triggered
            newState.lowerVisualBound = Math.max(this.state.lowerVisualBound - this.props.pageSize, 0);
            newState.upperVisualBound = newState.lowerVisualBound + rowDisplayBoundry;
            /**
             * if top most rows reached, do nothing, otherwise reset scrollTop to preserve current view
             */
            if (!(newState.lowerVisualBound === 0))
                setTimeout(function () {
                    $target.scrollTop(Math.max(scrollTop + this.props.pageSize * avgRowHeight, 0));
                }.bind(this));

        } else if (scrollTop > this.state.lastScrollTop && (scrollTop + height) >= totalHeight) {
            // down scroll limit triggered
            /**
             * we either increment upperVisualBound by a single page (specified via props.pageSize) or the max rows that can be displayed
             * we know the end has been reached if upperVisualBound + pageSize > maxRows
             */
            newState.upperVisualBound = this.state.upperVisualBound + this.props.pageSize > this.state.maxRows ? this.state.maxRows : this.state.upperVisualBound + this.props.pageSize;
            newState.lowerVisualBound = Math.max(newState.upperVisualBound - rowDisplayBoundry, 0);
            /**
             * if previous upperVisualBound is the default (props.pageSize), it could actually be greater than the current
             */
            const additionalRows = Math.max(newState.upperVisualBound - this.state.upperVisualBound, 0);
            if (additionalRows > 0)
                setTimeout(function () {
                    var newScrollTop = scrollTop - (additionalRows * avgRowHeight);
                    if (newScrollTop > 0)
                        $target.scrollTop(newScrollTop);
                }.bind(this));
        }
        this.setState(newState);
    },
    /* ----------------------------------------- */

    componentDidMount: function () {
        if (!this.props.disableInfiniteScrolling)
            $(this.getDOMNode()).find(".rt-scrollable").get(0).addEventListener('scroll', this.handleScroll);
        setTimeout(function () {
            adjustHeaders.call(this);
        }.bind(this), 0);
        setTimeout(function () {
            adjustHeaders.call(this);
        }.bind(this), 500);

        document.addEventListener('click', docClick.bind(this));
        window.addEventListener('resize', adjustHeaders.bind(this));
        var $node = $(this.getDOMNode());
        $node.find(".rt-scrollable").bind('scroll', function () {
            $node.find(".rt-headers").css({'overflow': 'auto'}).scrollLeft($(this).scrollLeft());
            $node.find(".rt-headers").css({'overflow': 'hidden'});
        });
        bindHeadersToMenu($node);
    },
    componentWillMount: function () {
    },
    componentWillUnmount: function () {
        window.removeEventListener('resize', adjustHeaders.bind(this));
        if (this.props.disableInfiniteScrolling)
            $(this.getDOMNode()).find(".rt-scrollable").get(0).removeEventListener('scroll', this.handleScroll);
    },
    componentDidUpdate: function () {
        adjustHeaders.call(this);
        bindHeadersToMenu($(this.getDOMNode()));
    },
    render: function () {
        const rasterizedData = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: this.state.columnDefs[0],
            selectedDetailRows: this.state.selectedDetailRows
        });
        // maxRows is referenced later during event handling to determine upperVisualBound
        this.state.maxRows = rasterizedData.length;

        // TODO merge lower&upper visual bound into state, refactor getPaginationAttr
        var paginationAttr = getPaginationAttr(this, rasterizedData);

        var rowsToDisplay = [];
        if (this.props.disableInfiniteScrolling)
            rowsToDisplay = rasterizedData.slice(paginationAttr.lowerVisualBound, paginationAttr.upperVisualBound + 1).map(rowMapper, this);
        else
            rowsToDisplay = rasterizedData.slice(this.state.lowerVisualBound, this.state.upperVisualBound + 1).map(rowMapper, this);

        var headers = buildHeaders(this);

        var containerStyle = {};
        if (this.props.height && parseInt(this.props.height) > 0)
            containerStyle.height = this.props.height;

        if (this.props.disableScrolling)
            containerStyle.overflowY = "hidden";

        return (
            React.createElement("div", {id: this.state.uniqueId, className: "rt-table-container"}, 
                headers, 
                React.createElement("div", {style: containerStyle, className: "rt-scrollable"}, 
                    React.createElement("table", {className: "rt-table"}, 
                        React.createElement("tbody", null, 
                        rowsToDisplay
                        )
                    )
                ), 
                this.props.disableInfiniteScrolling ? buildFooter(this, paginationAttr) : null
            )
        );
    }
});

/**
 * Represents a row in the table, built from cells
 */
var Row = React.createClass({displayName: "Row",
    render: function () {
        const cx = React.addons.classSet;
        var cells = [buildFirstCellForRow.call(this)];
        for (var i = 1; i < this.props.columnDefs.length; i++) {
            var columnDef = this.props.columnDefs[i];
            var displayInstructions = buildCellLookAndFeel(columnDef, this.props.data);
            var classes = cx(displayInstructions.classes);
            // easter egg - if isLoading is set to true on columnDef - spinners will show up instead of blanks or content
            var displayContent = columnDef.isLoading ?
                "Loading ... " : displayInstructions.value;

            // convert and format dates
            if (columnDef && columnDef.format && columnDef.format.toLowerCase() === "date") {
                if (typeof displayContent === "number") // if displayContent is a number, we assume displayContent is in milliseconds
                    displayContent = new Date(displayContent).toLocaleDateString();
            }
            // determine cell content, based on whether a cell templating callback was provided
            if (columnDef.cellTemplate)
                displayContent = columnDef.cellTemplate.call(this, this.props.data, columnDef, displayContent);
            cells.push(
                React.createElement("td", {
                    className: classes, 
                    onClick: columnDef.onCellSelect ? columnDef.onCellSelect.bind(null, this.props.data[columnDef.colTag], columnDef, i) : null, 
                    onContextMenu: this.props.onRightClick ? this.props.onRightClick.bind(null, this.props.data, columnDef) : null, 
                    style: displayInstructions.styles, 
                    key: columnDef.colTag, 
                    onDoubleClick: this.props.filtering && this.props.filtering.doubleClickCell ?
                                   this.props.handleColumnFilter(null, columnDef) : null}, 
                    displayContent
                )
            );
        }
        classes = cx({
            'selected': this.props.isSelected && this.props.data.isDetail,
            'summary-selected': this.props.isSelected && !this.props.data.isDetail
        });
        // apply extra CSS if specified
        return (React.createElement("tr", {onClick: this.props.onSelect.bind(null, this.props.data), 
                    className: classes, style: this.props.extraStyle}, cells));
    }
});

var PageNavigator = React.createClass({displayName: "PageNavigator",
    handleClick: function (index, event) {
        event.preventDefault();
        if (index <= this.props.numPages && index >= 1)
            this.props.handleClick(index);
    },
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
                    React.createElement("a", {onClick: self.handleClick.bind(null, item)}, item)
                )
            )
        });
        return (
            React.createElement("ul", {className: prevClass, className: "pagination pull-right"}, 
                React.createElement("li", {className: nextClass}, 
                    React.createElement("a", {className: prevClass, 
                       onClick: this.props.handleClick.bind(null, this.props.activeItem - 1)}, "«")
                ), 
                items, 
                React.createElement("li", {className: nextClass}, 
                    React.createElement("a", {className: nextClass, 
                       onClick: this.props.handleClick.bind(null, this.props.activeItem + 1)}, "»")
                )
            )
        );
    }
});

var SubtotalControl = React.createClass({displayName: "SubtotalControl",
    getInitialState: function () {
        return {
            userInputBuckets: ""
        }
    },
    handleChange: function (event) {
        this.setState({userInputBuckets: event.target.value});
    },
    handleKeyPress: function (event) {
        if (event.charCode == 13) {
            event.preventDefault();
            this.props.table.handleSubtotalBy(this.props.columnDef, this.state.userInputBuckets);
        }
    },
    handleClick: function () {
        var $node = $(this.getDOMNode());
        $node.children(".menu-item-input").children("input").focus();
    },
    render: function () {
        var table = this.props.table, columnDef = this.props.columnDef;
        var subMenuAttachment = columnDef.format == "number" || columnDef.format == "currency" ?
            (
                React.createElement("div", {className: "menu-item-input", style: {"position": "absolute", "top": "-50%", "right": "100%"}}, 
                    React.createElement("label", {style: {"display": "block"}}, "Enter Bucket(s)"), 
                    React.createElement("input", {tabIndex: "1", onKeyPress: this.handleKeyPress, onChange: this.handleChange, 
                           placeholder: "ex: 1,10,15"}), 
                    React.createElement("a", {tabIndex: "2", style: {"display": "block"}, 
                       onClick: table.handleSubtotalBy.bind(null, columnDef, this.state.userInputBuckets), 
                       className: "btn-link"}, "Ok")
                )
            ) : null;
        return (
            React.createElement("div", {
                onClick: subMenuAttachment == null ? table.handleSubtotalBy.bind(null, columnDef, null) : this.handleClick, 
                style: {"position": "relative"}, className: "menu-item menu-item-hoverable"}, 
                React.createElement("div", null, React.createElement("i", {className: "fa fa-plus"}), " Add Subtotal"), 
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
    return sectorPath.join("#");
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

function rowMapper(row) {
    var rowKey = this.props.rowKey;
    var generatedKey = generateRowKey(row, rowKey);
    return (React.createElement(Row, {
        key: generatedKey, 
        data: row, 
        extraStyle: resolveExtraStyles(generatedKey, this.props.extraStyle), 
        isSelected: isRowSelected(row, this.props.rowKey, this.state.selectedDetailRows, this.state.selectedSummaryRows), 
        onSelect: this.handleSelect, 
        onRightClick: this.props.onRightClick, 
        toggleHide: this.handleToggleHide, 
        columnDefs: this.state.columnDefs, 
        filtering: this.props.filtering, 
        handleColumnFilter: this.handleColumnFilter.bind}
        ));
}

function docClick(e) {
    adjustHeaders.call(this);
    // Remove filter-in-place boxes if they are open and they weren't clicked on
    if (!jQuery.isEmptyObject(this.state.filterInPlace)) {
        if (!($(e.target).hasClass("rt-headers-container") || $(e.target).parents(".rt-headers-container").length > 0)) {
            this.setState({
                filterInPlace: {}
            });
        }
    }
}

function adjustHeaders(adjustCount) {
    var id = this.state.uniqueId;
    if (!(adjustCount >= 0))
        adjustCount = 0;
    var counter = 0;
    var headerElems = $("#" + id + " .rt-headers-container");
    var padding = parseInt(headerElems.first().find(".rt-header-element").css("padding-left"));
    padding += parseInt(headerElems.first().find(".rt-header-element").css("padding-right"));
    var adjustedSomething = false;

    headerElems.each(function () {
        var currentHeader = $(this);
        var width = $('#' + id + ' .rt-table tr:last td:eq(' + counter + ')').outerWidth() - 1;
        if (counter == 0 && parseInt(headerElems.first().css("border-right")) == 1) {
            width += 1;
        }
        var headerTextWidthWithPadding = currentHeader.find(".rt-header-anchor-text").width() + padding;
        if (currentHeader.width() > 0 && headerTextWidthWithPadding > currentHeader.width() + 1) {
            currentHeader.css("width", headerTextWidthWithPadding + "px");
            $("#" + id).find("tr").find("td:eq(" + counter + ")").css("min-width", (headerTextWidthWithPadding) + "px");
            adjustedSomething = true;
        }
        if (width !== currentHeader.width()) {
            currentHeader.width(width);
            adjustedSomething = true;
        }
        counter++;
    });

    if (!adjustedSomething)
        return;

    // Realign sorting carets
    var downs = headerElems.find(".rt-downward-caret").removeClass("rt-downward-caret");
    var ups = headerElems.find(".rt-upward-caret").removeClass("rt-upward-caret");
    setTimeout(function () {
        downs.addClass("rt-downward-caret");
        ups.addClass("rt-upward-caret");
    }, 0);

    if (adjustCount <= 5)
        adjustHeaders.call(this, ++adjustCount);
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
}
/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function isRowSelected(row, rowKey, selectedDetailRows, selectedSummaryRows) {
    if (rowKey == null)
        return;
    return selectedDetailRows[row[rowKey]] != null || (!row.isDetail && selectedSummaryRows[generateSectorKey(row.sectorPath)] != null);
}

function resolveExtraStyles(generatedKey, extraStyles) {
    return generatedKey && extraStyles ? extraStyles[generatedKey] : null;
}

function getPaginationAttr(table, data) {
    var result = {};

    if (table.props.disablePagination) {
        result.lowerVisualBound = 0;
        result.upperVisualBound = data.length
    } else {
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
    }

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
;/**
 * - STOP -
 *
 * please do not add too many states to the table. Per react.js documentation for best practices, any value derivable from props alone should NOT be stored as a state
 * but instead should be computed each time as the render() function.
 *
 * states are used to store info that cannot be inferred or derived from 'props', such as user interaction that occur within the component (collapsing a subtotal grouping / adding a column to sort)
 *
 */
function ReactTableGetInitialState() {

    var initialState = {
        uniqueId: uniqueId("table"), // i guess since this is randomly generated, it is not derivable from props alone
        currentPage: 1, // self-explanatory
        lastScrollTop: 0, // self-explanatory, this is the spiritual of currentPage for paginators

        // we shall consider any props that is modifiable through user interaction a state
        columnDefs: this.props.columnDefs,
        subtotalBy: this.props.subtotalBy,
        sortBy: this.props.sortBy,

        lowerVisualBound: 0,
        upperVisualBound: this.props.pageSize,
        extraStyle: {}, // TODO document use
        filterInPlace: {}, // TODO document use, but sounds like a legit state
        currentFilters: [] // TODO same as above
    };

    /**
     * justifiable as a state because its children contain sub-states like collapse/expanded or hide/un-hide
     * these states/sub-states arise from user interaction with this component, and not derivable from props or other states
     */
    initialState.rootNode = createNewRootNode(this.props, initialState);
    if (initialState.sortBy.length > 0)
        initialState.rootNode.sortNodes(convertSortByToFuncs(initialState.columnDefs, initialState.sortBy));

    var selections = getInitialSelections(this.props.selectedRows, this.props.selectedSummaryRows);
    initialState.selectedDetailRows = selections.selectedDetailRows;
    initialState.selectedSummaryRows = selections.selectedSummaryRows;

    return initialState;
}

function ReactTableHandleSelect(selectedRow) {
    var rowKey = this.props.rowKey;
    if (rowKey == null)
        return;
    if (selectedRow.isDetail != null & selectedRow.isDetail == true)
        this.props.onSelectCallback(selectedRow, this.toggleSelectDetailRow(selectedRow[rowKey]));
    else if (this.props.onSummarySelectCallback)
        this.props.onSummarySelectCallback(selectedRow, this.toggleSelectSummaryRow(generateSectorKey(selectedRow.sectorPath)));

}

function ReactTableHandleColumnFilter(columnDefToFilterBy, e, dontSet) {
    if (typeof dontSet !== "boolean")
        dontSet = undefined;

    var filterData = e.target ? (e.target.value || e.target.textContent) : e;
    var caseSensitive = !(this.props.filtering && this.props.filtering.caseSensitive === false);

    if (!dontSet) {
        // Find if this column has already been filtered.  If it is, we need to remove it before filtering again
        for (var i = 0; i < this.state.currentFilters.length; i++) {
            if (this.state.currentFilters[i].colDef === columnDefToFilterBy) {
                this.state.currentFilters.splice(i, 1);
                this.handleClearFilter(columnDefToFilterBy, true);
                break;
            }
        }
    }

    var customFilterer;
    if (this.props.filtering && this.props.filtering.customFilterer) {
        customFilterer = this.props.filtering.customFilterer;
    }
    this.state.rootNode.filterByColumn(columnDefToFilterBy, filterData, caseSensitive, customFilterer);

    if (!dontSet) {
        this.state.currentFilters.push({colDef: columnDefToFilterBy, filterText: filterData});
        $("input.rt-" + columnDefToFilterBy.colTag + "-filter-input").val(filterData);
        this.setState({rootNode: this.state.rootNode, currentFilters: this.state.currentFilters});
    }
}

function ReactTableHandleRemoveFilter(colDef, dontSet) {
    if (typeof dontSet !== "boolean")
        dontSet = undefined;

    // First clear out all filters
    for (var i = 0; i < this.state.rootNode.ultimateChildren.length; i++) {
        this.state.rootNode.ultimateChildren[i].hiddenByFilter = false;
    }
    // Remove filter from list of current filters
    for (i = 0; i < this.state.currentFilters.length; i++) {
        if (this.state.currentFilters[i].colDef === colDef) {
            this.state.currentFilters.splice(i, 1);
            break;
        }
    }
    // Re-filter by looping through old filters
    for (i = 0; i < this.state.currentFilters.length; i++) {
        this.handleColumnFilter(this.state.currentFilters[i].colDef, this.state.currentFilters[i].filterText, true);
    }

    if (!dontSet) {
        var fip = this.state.filterInPlace;
        delete fip[colDef.colTag];
        this.setState({
            filterInPlace: fip,
            rootNode: this.state.rootNode,
            currentFilters: this.state.currentFilters
        });
        $("input.rt-" + colDef.colTag + "-filter-input").val("");
    }
}

function ReactTableHandleRemoveAllFilters() {
    recursivelyClearFilters(this.state.rootNode);
    this.setState({
        filterInPlace: {},
        rootNode: this.state.rootNode,
        currentFilters: []
    });
    $("input.rt-filter-input").val("");
}

function recursivelyClearFilters(node) {
    node.clearFilter();

    for (var i = 0; i < node.children.length; i++) {
        recursivelyClearFilters(node.children[i]);
    }

    if (!node.hasChild()) {
        for (var i = 0; i < node.ultimateChildren.length; i++) {
            node.ultimateChildren[i].hiddenByFilter = false;
        }
    }
}

function applyAllFilters() {
    for (var i = 0; i < this.state.currentFilters.length; i++) {
        this.handleColumnFilter(this.state.currentFilters[i].colDef, this.state.currentFilters[i].filterText, true);
    }
    this.setState({rootNode: this.state.rootNode});
}

function ReactTableHandleClearSubtotal(event) {
    event.stopPropagation();
    const newState = this.state;
    newState.currentPage = 1;
    newState.lowerVisualBound = 0;
    newState.upperVisualBound = this.props.pageSize;
    newState.firstColumnLabel = buildFirstColumnLabel(this);
    /**
     * do not set subtotalBy or sortBy to blank array - simply pop all elements off, so it won't disrupt external reference
     */
    const subtotalBy = this.state.subtotalBy;
    while (subtotalBy.length > 0)
        subtotalBy.pop();
    newState.subtotalBy = subtotalBy;
    newState.rootNode = createNewRootNode(this.props, newState);
    this.setState(newState);
}

function ReactTableHandleSubtotalBy(columnDef, partitions, event) {
    event.stopPropagation();
    var subtotalBy = this.state.subtotalBy || [];
    /**
     * determine if the subtotal operation require partitioning of the column values first
     */
    if (partitions != null && partitions != "" && columnDef)
        columnDef.subtotalByRange = partitionNumberLine(partitions);

    /**
     * if the passed in columnDef is null, then we clear all subtotal
     */
    if (columnDef != null && columnDef.constructor.name != 'SyntheticMouseEvent')
        subtotalBy.push(columnDef);
    else if (columnDef != null && columnDef.constructor.name === 'SyntheticMouseEvent')
        subtotalBy = [];

    if (this.state.currentFilters.length > 0)
        applyAllFilters.call(this);

    /**
     * extend the current state to derive new state after subtotal operation, then create a new rootNode
     */
    const newState = this.state;
    newState.currentPage = 1;
    newState.lowerVisualBound = 0;
    newState.upperVisualBound = this.props.pageSize;
    newState.firstColumnLabel = buildFirstColumnLabel(this);
    newState.subtotalBy = subtotalBy;
    newState.rootNode = createNewRootNode(this.props, newState);
    this.setState(newState);
}

function ReactTableHandleAdd() {
    if (this.props.beforeColumnAdd)
        this.props.beforeColumnAdd(this);
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
    this.setState({});
}

function ReactTableHandlePageClick(page) {
    this.setState({
        currentPage: page
    });

}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */
function partitionNumberLine(partitions) {
    var i, stringBuckets, floatBuckets = [];
    stringBuckets = partitions.split(",");
    for (i = 0; i < stringBuckets.length; i++) {
        var floatBucket = parseFloat(stringBuckets[i]);
        if (!isNaN(floatBucket))
            floatBuckets.push(floatBucket);
        floatBuckets.sort(function (a, b) {
            return a - b;
        });
    }
    return floatBuckets;
}

function buildFirstColumnLabel(table) {
    var result = [];
    if (table.state.subtotalBy) {
        for (var i = 0; i < table.state.subtotalBy.length; i++)
            result.push(table.state.subtotalBy[i].text);
    }
    result.push(table.state.columnDefs[0].text);
    return result;
}

function getInitialSelections(selectedRows, selectedSummaryRows) {
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
;const lexicalSorter = {
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
        const columnDef = findDefByColTag(columnDefs, s.colTag);
        if (columnDef)
            return getSortFunction(columnDef, s.sortType);
        else return function () {
        };
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
;/**
 * Transform the current props into a tree structure representing the complex state
 * @param props
 * @return {TreeNode}
 */
function createNewRootNode(props, state) {

    var rootNode = buildTreeSkeleton(props, state);
    recursivelyAggregateNodes(rootNode, state);

    rootNode.sortRecursivelyBySortIndex();
    rootNode.foldSubTree();

    return rootNode;
}

/**
 * Creates the TreeNode structure backed by props.data and grouped by columns specified in subtotalBy
 * @param props
 * @param state
 * @return {TreeNode} the root node
 */
function buildTreeSkeleton(props, state) {
    var rootNode = new TreeNode("Grand Total", null), rawData = props.data, i;
    if (props.disableGrandTotal)
        rootNode.display = false
    for (i = 0; i < rawData.length; i++) {
        rootNode.appendUltimateChild(rawData[i]);
        populateChildNodesForRow(rootNode, rawData[i], state.subtotalBy);
    }
    return rootNode
}

/**
 * Populate an existing skeleton (represented by the root node) with summary level data
 * @param node
 * @param tableProps
 */
function recursivelyAggregateNodes(node, state) {
    // aggregate the current node
    node.rowData = aggregateSector(node.ultimateChildren, state.columnDefs, state.subtotalBy);

    // for each child - aggregate those as well
    if (node.children.length > 0) {
        for (var i = 0; i < node.children.length; i++)
            recursivelyAggregateNodes(node.children[i], state);
    }
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function populateChildNodesForRow(rootNode, row, subtotalBy) {
    var i, currentNode = rootNode;
    if (subtotalBy == null || subtotalBy.length == 0)
        return;
    for (i = 0; i < subtotalBy.length; i++) {
        var result = getSectorName(row, subtotalBy[i]);
        currentNode = currentNode.appendRowToChildren({
            childSectorName: result.sectorName,
            childRow: row,
            sortIndex: result.sortIndex,
            subtotalByColumnDef: subtotalBy[i]
        });
    }
}
;/**
 * Represents a grouping of table rows with references to children that are also grouping
 * of rows
 * @constructor
 */
function TreeNode(sectorTitle, parent) {
    // accessible properties
    this.sectorTitle = sectorTitle;
    this.parent = parent;
    this.subtotalByColumnDef = {};
    this.rowData = null;
    this.display = true;
    this.children = [];
    this.ultimateChildren = [];
    this.collapsed = this.parent != null;
    this.sortIndex = null;
    this.hiddenByFilter = false;
    // private members
    this._childrenSectorNameMap = {}
}

TreeNode.prototype.appendUltimateChild = function (row) {
    this.ultimateChildren.push(row)
}

TreeNode.prototype.collapseImmediateChildren = function () {
    for (var i = 0; i < this.children.length; i++)
        this.children[i].collapsed = true;
}

TreeNode.prototype.foldSubTree = function () {
    for (var i = 0; i < this.children.length; i++) {
        if (!this.children[i].hasChild())
            this.children[i].collapsed = true;
        else
            this.children[i].collapsed = false;
        this.children[i].foldSubTree();
    }
};

TreeNode.prototype.hasChild = function () {
    return (this.children.length > 0);
};

TreeNode.prototype.expandRecursively = function () {
    var i;
    for (i = 0; i < this.children.length; i++) {
        this.children[i].collapsed = false;
        this.children[i].expandRecursively();
    }
};

/**
 * Appends the given row into the ultimateChildren of the specified child node of the current node
 * @param childSectorName
 * @param childRow
 * @returns the child TreeNode that the data was appended to
 */
TreeNode.prototype.appendRowToChildren = function (options) {
    var childSectorName = options.childSectorName, childRow = options.childRow, sortIndex = options.sortIndex, subtotalByColumnDef = options.subtotalByColumnDef;
    // create a new child node if one by the current sector name does not exist
    if (this._childrenSectorNameMap[childSectorName] == null) {
        var child = new TreeNode(childSectorName, this);
        child.sortIndex = sortIndex;
        child.subtotalByColumnDef = subtotalByColumnDef;
        this.children.push(child);
        this._childrenSectorNameMap[childSectorName] = child;
    }
    if (childRow)
        this._childrenSectorNameMap[childSectorName].appendUltimateChild(childRow);
    return this._childrenSectorNameMap[childSectorName];
};

TreeNode.prototype.getSectorPath = function () {
    var result = [this.sectorTitle], prevParent = this.parent;
    while (prevParent != null) {
        result.unshift(prevParent.sectorTitle);
        prevParent = prevParent.parent;
    }
    return result;
};

/**
 * Return a composite sorter that takes multiple sort functions in an array and apply them in order.
 * @param funcs the list of functions to sort by
 * @param isSummaryRow indicate whether the sort function are to be applied to sumamry rows, whose `rowData` property needs to be compared
 *
 * @returns {Function} a function that sorts the comparable elements by using constituents of funcs until the 'tie' is broken
 */
function buildCompositeSorter(funcs, isSummaryRow) {
    return function (a, b) {
        var i = 0, sortOutcome = 0;
        while (sortOutcome == 0 && i < funcs.length) {
            if (isSummaryRow)
                sortOutcome = funcs[i](a.rowData, b.rowData);
            else
                sortOutcome = funcs[i](a, b);
            i++;
        }
        return sortOutcome;
    }
}

/**
 * Sort the child nodes of this node recursively according to the array of sort functions passed into sortFuncs
 * @param sortFuncs
 */
TreeNode.prototype.sortNodes = function (sortFuncs) {
    if (this.hasChild()) {
        this.children.sort(buildCompositeSorter(sortFuncs, true));
        $.each(this.children, function (idx, child) {
            child.sortNodes(sortFuncs);
        });
    }
    else
        this.ultimateChildren.sort(buildCompositeSorter(sortFuncs, false));
};

TreeNode.prototype.filterByColumn = function (columnDef, textToFilterBy, caseSensitive, customFilterer) {
    if (columnDef.format === "number")
        this.filterByNumericColumn(columnDef, textToFilterBy);
    else
        this.filterByTextColumn(columnDef, textToFilterBy, caseSensitive, customFilterer);
};

TreeNode.prototype.filterByTextColumn = function (columnDef, textToFilterBy, caseSensitive, customFilterer) {
    // Filter aggregations
    for (var i = 0; i < this.children.length; i++) {
        // Call recursively to filter leaf nodes first
        this.children[i].filterByColumn(columnDef, textToFilterBy, caseSensitive, customFilterer);
        // Check to see if all children are hidden, then hide parent if so
        var allChildrenHidden = true;
        for (var j = 0; j < this.children[i].ultimateChildren.length; j++) {
            if (!this.children[i].ultimateChildren[j].hiddenByFilter) {
                allChildrenHidden = false;
                break;
            }
        }
        this.children[i].hiddenByFilter = allChildrenHidden;
    }
    if (!this.hasChild()) {
        for (var i = 0; i < this.ultimateChildren.length; i++) {
            var uChild = this.ultimateChildren[i];
            if (customFilterer) {
                uChild.hiddenByFilter = !customFilterer(columnDef, uChild, textToFilterBy);
            }
            else {
                var row = {};
                row[columnDef.colTag] = uChild[columnDef.colTag];
                if (caseSensitive)
                    uChild.hiddenByFilter = uChild.hiddenByFilter || buildCellLookAndFeel(columnDef, row).value.toString().search(textToFilterBy) === -1;
                else
                    uChild.hiddenByFilter = uChild.hiddenByFilter || buildCellLookAndFeel(columnDef, row).value.toString().toUpperCase().search(textToFilterBy.toUpperCase()) === -1;
            }
        }
    }
};

TreeNode.prototype.filterByNumericColumn = function (columnDef, filterData) {
    // Filter aggregations
    for (var i = 0; i < this.children.length; i++) {
        // Call recursively to filter leaf nodes first
        this.children[i].filterByNumericColumn(columnDef, filterData);
        // Check to see if all children are hidden, then hide parent if so
        var allChildrenHidden = true;
        for (var j = 0; j < this.children[i].ultimateChildren.length; j++) {
            if (!this.children[i].ultimateChildren[j].hiddenByFilter) {
                allChildrenHidden = false;
                break;
            }
        }
        this.children[i].hiddenByFilter = allChildrenHidden;
    }
    if (!this.hasChild()) {
        for (var i = 0; i < this.ultimateChildren.length; i++) {
            var uChild = this.ultimateChildren[i];
            var row = {};
            row[columnDef.colTag] = uChild[columnDef.colTag];
            var filterOutNode = false;
            var multiplier = buildLAFConfigObject(columnDef).multiplier;
            var value = row[columnDef.colTag] * parseFloat(multiplier);
            for (var j = 0; j < filterData.length; j++) {
                if (filterData[j].gt !== undefined) {
                    if (!(value > filterData[j].gt))
                        filterOutNode = true;
                }
                else if (filterData[j].lt !== undefined) {
                    if (!(value < filterData[j].lt))
                        filterOutNode = true;
                }
                else if (filterData[j].eq !== undefined) {
                    if (!(value == filterData[j].eq))
                        filterOutNode = true;
                }
            }

            uChild.hiddenByFilter = filterOutNode;
        }
    }
};

TreeNode.prototype.clearFilter = function () {
    this.hiddenByFilter = false;
};

TreeNode.prototype.sortRecursivelyBySortIndex = function () {
    // test if children have sortIndex - if not skip sorting children
    if (this.hasChild() && _hasSortIndex(this.children[0])) {
        this.children.sort(function (a, b) {
            if (_hasSortIndex(a) && _hasSortIndex(b))
                return a.sortIndex - b.sortIndex;
            return 0;
        });
    }
    // sort children's children
    for (var i = 0; i < this.children.length; i++)
        this.children[i].sortRecursivelyBySortIndex();
};

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _hasSortIndex(node) {
    return (node != null && node.sortIndex != null && !isNaN(node.sortIndex))
}
;/**
 * Converts the table state from a tree format to a array of rows for rendering
 * @param rootNode
 * @return {Array}
 */
function rasterizeTree(options) {
    var node = options.node, firstColumn = options.firstColumn;

    node = _decorateRowData(node, firstColumn);
    var flatData = node.display == false ? [] : [node.rowData];

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
        for (j = 0; j < intermediateResult.length; j++) {
            if( !(intermediateResult[j].treeNode && intermediateResult[j].treeNode.hiddenByFilter) )
                flatData.push(intermediateResult[j]);
        }
    }
}

function _rasterizeDetailRows(node, flatData) {
    for (var i = 0; i < node.ultimateChildren.length; i++) {
        var detailRow = node.ultimateChildren[i];
        if( !detailRow.hiddenByFilter ) {
            detailRow.sectorPath = node.rowData.sectorPath;
            detailRow.isDetail = true;
            flatData.push(detailRow);
        }
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