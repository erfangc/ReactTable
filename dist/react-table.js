/** @jsx React.DOM */

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

function _computeCellAlignment(alignment, row, columnDef) {
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
    results.styles.textAlign = _computeCellAlignment(formatConfig.alignment, row, columnDef);
    results.styles.width = columnDef.text.length + "em";
    results.value = value;

    // show zero as blank
    if (formatConfig.showZeroAsBlank && results.value == 0)
        results.value = "";

    return results;
}

function getColumnAlignment(columnDef) {
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
    var popupStyle = {
        "position": "absolute",
        "top": "-50%",
        "whiteSpace": "normal",
        "width": "250px"
    };
    for (var menuItemTitle in table.props.customMenuItems) {
        for (var menuItemType in table.props.customMenuItems[menuItemTitle]) {
            if (menuItemType == "infoBox") {
                if (columnDef[table.props.customMenuItems[menuItemTitle][menuItemType]]) {
                    var direction = table.state.columnDefs.indexOf(columnDef) * 10 / table.state.columnDefs.length > 5 ?
                        "right" : "left";
                    var styles = {};
                    for (var k in popupStyle) styles[k] = popupStyle[k];
                    styles[direction] = "100%";
                    menuItems.push(
                        React.DOM.div({style: {"position": "relative"}, className: "menu-item menu-item-hoverable"}, 
                            React.DOM.div(null, menuItemTitle), 
                            React.DOM.div({className: "menu-item-input", style: styles}, 
                                React.DOM.div({style: {"display": "block"}}, 
                                    columnDef[table.props.customMenuItems[menuItemTitle][menuItemType]]
                                )
                            )
                        )
                    );
                }
            }
        }
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

    // construct user custom menu items
    var menuItems = []
    var availableDefaultMenuItems = {
        sort: [
            //<div className="menu-item" onClick={table.handleSort.bind(null, columnDef, true)}>Sort Asc</div>,
            //<div className="menu-item" onClick={table.handleSort.bind(null, columnDef, false)}>Sort Dsc</div>,
            React.DOM.div({className: "menu-item", onClick: table.handleAddSort.bind(null, columnDef, true)}, "Add Sort Asc"),
            React.DOM.div({className: "menu-item", onClick: table.handleAddSort.bind(null, columnDef, false)}, "Add Sort Dsc"),
            React.DOM.div({className: "menu-item", onClick: table.replaceData.bind(null, table.props.data, true)}, "Clear Sort")
        ],
        filter:[
            React.DOM.div({className: "menu-item", onClick: table.handleClearFilter.bind(null, columnDef)}, "Clear Filter"),
            React.DOM.div({className: "menu-item", onClick: table.handleClearAllFilters.bind(null)}, "Clear All Filters")
        ],
        summarize: [
            SummarizeControl({table: table, columnDef: columnDef}),
            React.DOM.div({className: "menu-item", onClick: table.handleGroupBy.bind(null, null)}, "Clear Summary")
        ],
        remove: [
            React.DOM.div({className: "menu-item", onClick: table.handleRemove.bind(null, columnDef)}, "Remove Column")
        ]
    };
    if (table.props.defaultMenuItems) {
        for (var i = 0; i < table.props.defaultMenuItems.length; i++) {
            var itemName = table.props.defaultMenuItems[i];
            _addMenuItems(menuItems, availableDefaultMenuItems[itemName]);
        }
    } else {
        _addMenuItems(menuItems, availableDefaultMenuItems.sort);
        _addMenuItems(menuItems, availableDefaultMenuItems.filter);
        _addMenuItems(menuItems, availableDefaultMenuItems.summarize);
        if (!isFirstColumn)
            _addMenuItems(menuItems, availableDefaultMenuItems.remove);
    }

    var customMenuItems = buildCustomMenuItems(table, columnDef);
    menuItems.push(customMenuItems);

    if (isFirstColumn) {
        menuItems.push(React.DOM.div({className: "separator"}));
        if( !table.props.disableExporting ) {
            menuItems.push(React.DOM.div({className: "menu-item", onClick: table.handleDownload.bind(null, "excel")}, "Download as XLS"));
            menuItems.push(React.DOM.div({className: "menu-item", onClick: table.handleDownload.bind(null, "pdf")}, "Download as PDF"));
        }

        menuItems.push(React.DOM.div({className: "menu-item", onClick: table.handleCollapseAll.bind(null, null)}, "Collapse All"));
        menuItems.push(React.DOM.div({className: "menu-item", onClick: table.handleExpandAll.bind(null)}, "Expand All"));
    }

    return (
        React.DOM.div({style: menuStyle, className: "rt-header-menu"}, 
            menuItems
        )
    );
}

function _addMenuItems(master, children) {
    for (var j = 0; j < children.length; j++)
        master.push(children[j])
}

function toggleFilterBox(table, colTag) {
    var fip = table.state.filterInPlace;
    fip[colTag] = !fip[colTag];
    table.setState({
        filterInPlace: fip
    });
    setTimeout(function(){
        $("input.rt-" + colTag + "-filter-input").focus();
    });
}

function pressedKey(table, colTag, e){
    const ESCAPE = 27;
    if( table.state.filterInPlace[colTag] && e.keyCode == ESCAPE ){
        table.state.filterInPlace[colTag] = false;
        table.setState({
            filterInPlace: table.state.filterInPlace
        });
    }
}

function buildHeaders(table) {
    var columnDef = table.state.columnDefs[0], i, style = {};
    var textClasses = "btn-link rt-header-anchor-text" + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? " rt-hide" : "");
    var numericPanelClasses = "rt-numeric-filter-container" + (columnDef.format === "number" && table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide");
    var ss = {
        width: "100%",
        height: "13px",
        padding: "0"
    };
    var firstColumn = (
        React.DOM.div({className: "rt-headers-container", 
            onDoubleClick: table.state.sortAsc === undefined || table.state.sortAsc === null || columnDef != table.state.columnDefSorted ?
                table.handleSort.bind(null, columnDef, true) :
                (columnDef == table.state.columnDefSorted && table.state.sortAsc ?
                    table.handleSort.bind(null, columnDef, false) : table.replaceData.bind(null, table.props.data, true))}, 
            React.DOM.div({style: {textAlign: "center"}, className: "rt-header-element", key: columnDef.colTag}, 
                React.DOM.a({href: "#", className: textClasses, 
                   onClick: table.props.filtering && table.props.filtering.disable ? null : toggleFilterBox.bind(null, table, columnDef.colTag)}, 
                    table.state.firstColumnLabel.join("/")
                ), 
                React.DOM.input({style: ss, className: ("rt-" + columnDef.colTag + "-filter-input rt-filter-input") + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? "" : " rt-hide"), 
                    onChange: table.handleColumnFilter.bind(null, columnDef), 
                    onKeyDown: pressedKey.bind(null, table, columnDef.colTag)})
            ), 
            React.DOM.div({className: "rt-caret-container"}, 
                table.state.sortAsc != undefined && table.state.sortAsc === true &&
                columnDef === table.state.columnDefSorted ? React.DOM.div({className: "rt-upward-caret"}) : null, 
                table.state.sortAsc != undefined && table.state.sortAsc === false &&
                columnDef === table.state.columnDefSorted ? React.DOM.div({className: "rt-downward-caret"}) : null
            ), 
            React.DOM.div({className: numericPanelClasses}, 
                NumericFilterPanel(null)
            ), 
            table.state.filterInPlace[columnDef.colTag] ? null : buildMenu({table: table, columnDef: columnDef, style: {textAlign: "left"}, isFirstColumn: true})
        )
    );
    var headerColumns = [firstColumn];
    for (i = 1; i < table.state.columnDefs.length; i++) {
        columnDef = table.state.columnDefs[i];
        style = {textAlign: "center"};
        var numericPanelClasses = "rt-numeric-filter-container" + (columnDef.format === "number" && table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide");
        var textClasses = "btn-link rt-header-anchor-text" + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? " rt-hide" : "");
        // bound this on <a> tag: onClick={table.props.disableFilter ? null : toggleFilterBox.bind(null, table, columnDef.colTag)}}
        headerColumns.push(
            React.DOM.div({className: "rt-headers-container", 
                onDoubleClick: table.state.sortAsc === undefined || table.state.sortAsc === null || columnDef != table.state.columnDefSorted ?
                               table.handleSort.bind(null, columnDef, true) :
                                  (columnDef == table.state.columnDefSorted && table.state.sortAsc ?
                                   table.handleSort.bind(null, columnDef, false) : table.replaceData.bind(null, table.props.data, true))}, 
                React.DOM.div({style: style, className: "rt-header-element rt-info-header", key: columnDef.colTag}, 
                    React.DOM.a({href: "#", className: textClasses, 
                       onClick: table.props.filtering && table.props.filtering.disable ? null : toggleFilterBox.bind(null, table, columnDef.colTag)}, 
                        columnDef.text
                    ), 
                    React.DOM.input({style: ss, className: ("rt-" + columnDef.colTag + "-filter-input rt-filter-input") + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? "" : " rt-hide"), 
                           onChange: table.handleColumnFilter.bind(null, columnDef), 
                           onKeyDown: pressedKey.bind(null, table, columnDef.colTag)})
                ), 
                React.DOM.div({className: "rt-caret-container"}, 
                    table.state.sortAsc != undefined && table.state.sortAsc === true &&
                    columnDef === table.state.columnDefSorted ? React.DOM.div({className: "rt-upward-caret"}) : null, 
                    table.state.sortAsc != undefined && table.state.sortAsc === false &&
                    columnDef === table.state.columnDefSorted ? React.DOM.div({className: "rt-downward-caret"}) : null
                ), 
                React.DOM.div({className: numericPanelClasses}, 
                    NumericFilterPanel({clearFilter: table.handleClearFilter, 
                                        addFilter: table.handleColumnFilter, 
                                        colDef: columnDef, 
                                        currentFilters: table.state.currentFilters})
                ), 
                table.state.filterInPlace[columnDef.colTag] ? null : buildMenu({table: table, columnDef: columnDef, style: style, isFirstColumn: false})
            )
        );
    }

    var corner;
    var classString = "btn-link rt-plus-sign";
    if( !table.props.disableAddColumnIcon && table.props.cornerIcon ){
        corner = React.DOM.img({src: table.props.cornerIcon});
        classString = "btn-link rt-corner-image";
    }


    // the plus sign at the end
    headerColumns.push(
        React.DOM.span({className: "rt-header-element rt-add-column", style: {"textAlign": "center"}}, 
            React.DOM.a({className: classString, onClick: table.props.disableAddColumn ? null : table.handleAdd}, 
                React.DOM.strong(null, corner ? corner : (table.props.disableAddColumn ? '' : '+'))
            )
        ));
    return (
        React.DOM.div({className: "rt-headers-grand-container"}, 
            React.DOM.div({key: "header", className: "rt-headers"}, 
                headerColumns
            )
        )
    );
}

function buildFirstCellForRow() {
    var props = this.props;
    var data = props.data, columnDef = props.columnDefs[0], toggleHide = props.toggleHide;
    var firstColTag = columnDef.colTag, userDefinedElement, result;

    // if sectorPath is not available - return a normal cell
    if (!data.sectorPath)
        return React.DOM.td({key: firstColTag, 
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
        result = React.DOM.td({style: firstCellStyle, key: firstColTag, 
            onDoubleClick: this.props.filtering && this.props.filtering.doubleClickCell ?
                this.props.handleColumnFilter(null, columnDef) : null}, 
                   data[firstColTag]);
    else {
        result =
            (
                React.DOM.td({style: firstCellStyle, key: firstColTag}, 
                    React.DOM.a({onClick: toggleHide.bind(null, data), className: "btn-link rt-expansion-link"}, 
                        data.treeNode.collapsed ? '+' : '—'
                    ), 
                    "  ", 
                    React.DOM.strong(null, data[firstColTag]), 
                    userDefinedElement
                )
            );
    }
    return result;
}

function buildFooter(table, paginationAttr) {
    return table.props.columnDefs.length > 0 && !table.props.disablePagination ?
        (PageNavigator({
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
    return {sectorName: sectorName || "Other", sortIndex: sortIndex};
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
        case "count_and_distinct":
            result = _countAndDistinct({data: bucketResult, columnDef: columnDef});
            break;
        case "most_data_points":
            result = _mostDataPoints({data: bucketResult, columnDef: columnDef});
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
    for( var i=0; i<options.data.length; i++ ){
        if( options.data[i][options.columnDef.colTag] || options.data[i][options.columnDef.colTag] === 0 )
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
    for (i = 0; i < options.data.length; i++){
        if ( !data[i][columnDef.colTag] ) continue;
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
    for( var i=0; i<options.data.length; i++ ){
        var sizeOfObj = Object.keys(options.data[i]).length;
        if( sizeOfObj > best.count || (sizeOfObj === best.count &&
                            options.data[i].aggregationTiebreaker > options.data[best.index].aggregationTiebreaker) ){
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

        $.each(value, function(j, value2) {
            if( table.state.columnDefs[j].format && table.state.columnDefs[j].format.toLowerCase() === "date" ){
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
};/** @jsx React.DOM */

function topPosition(domElt) {
    if (!domElt) {
        return 0;
    }
    return domElt.offsetTop + topPosition(domElt.offsetParent);
}

var InfiniteScroll = React.createClass({
    displayName: 'InfiniteScroll',
    propTypes: {
        pageStart: React.PropTypes.number,
        threshold: React.PropTypes.number,
        loadMore: React.PropTypes.func.isRequired,
        hasMore: React.PropTypes.bool
    },
    getDefaultProps: function () {
        return {
            pageStart: 0,
            hasMore: false,
            threshold: 250
        };
    },
    componentDidMount: function () {
        this.pageLoaded = this.props.pageStart;
        this.attachScrollListener();
    },
    componentDidUpdate: function () {
        this.attachScrollListener();
    },
    render: function () {
        var props = this.props;
        return React.DOM.div(null, props.children, props.hasMore && (props.loader || InfiniteScroll._defaultLoader));
    },
    scrollListener: function () {
        var el = this.getDOMNode();
        var scrollTop = (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
        if (topPosition(el) + el.offsetHeight - scrollTop - window.innerHeight < Number(this.props.threshold)) {
            this.detachScrollListener();
            // call loadMore after detachScrollListener to allow
            // for non-async loadMore functions
            this.props.loadMore(this.pageLoaded += 1);
        }
    },
    attachScrollListener: function () {
        if (!this.props.hasMore) {
            return;
        }
        window.addEventListener('scroll', this.scrollListener);
        window.addEventListener('resize', this.scrollListener);
        this.scrollListener();
    },
    detachScrollListener: function () {
        window.removeEventListener('scroll', this.scrollListener);
        window.removeEventListener('resize', this.scrollListener);
    },
    componentWillUnmount: function () {
        this.detachScrollListener();
    }
});
InfiniteScroll.setDefaultLoader = function (loader) {
    InfiniteScroll._defaultLoader = loader;
};;/** @jsx React.DOM */

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
            React.DOM.div(null, 
                React.DOM.input({'data-order': "0", className: "rt-numeric-checkbox", type: "checkbox", checked: this.state.entry0.checked, onChange: this.changeCheckbox}), 
                React.DOM.select({'data-order': "0", className: "rt-numeric-dropdown"}, 
                    React.DOM.option({value: "gt"}, "Greater Than"), 
                    React.DOM.option({value: "lt"}, "Less Than"), 
                    React.DOM.option({value: "eq"}, "Equals")
                ), 
                React.DOM.input({'data-order': "0", className: "rt-numeric-input", style: inputStyle, type: "number"}), 

                React.DOM.br(null), 

                React.DOM.input({'data-order': "1", className: "rt-numeric-checkbox", type: "checkbox", checked: this.state.entry1.checked, onChange: this.changeCheckbox}), 
                React.DOM.select({'data-order': "1", className: "rt-numeric-dropdown"}, 
                    React.DOM.option({value: "gt"}, "Greater Than"), 
                    React.DOM.option({value: "lt"}, "Less Than"), 
                    React.DOM.option({value: "eq"}, "Equals")
                ), 
                React.DOM.input({'data-order': "1", className: "rt-numeric-input", style: inputStyle, type: "number"}), 

                React.DOM.br(null), 

                React.DOM.button({onClick: this.handleChange}, "Submit")
            )
        );
    }
});;/** @jsx React.DOM */

/**
 * The core data is represented as a multi-node tree structure, where each node on the tree represents a 'sector'
 * and can refer to children 'sectors'
 * @author Erfang Chen
 */
var idCounter = 0;
var SECTOR_SEPARATOR = "#";

var ReactTable = React.createClass({displayName: 'ReactTable',

    getInitialState: ReactTableGetInitialState,

    /* --- Called by component or child react components --- */
    handleSort: ReactTableHandleSort,
    handleAddSort: ReactTableHandleAddSort,
    handleColumnFilter: ReactTableHandleColumnFilter,
    handleClearFilter: ReactTableHandleRemoveFilter,
    handleClearAllFilters: ReactTableHandleRemoveAllFilters,
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
    addColumn: function (columnDef, data) {
        // Update if exists
        var updated = false;
        for (var i = 0; i < this.state.columnDefs.length; i++) {
            if (this.state.columnDefs[i].colTag == columnDef.colTag) {
                this.state.columnDefs[i] = columnDef;
                updated = true;
                break;
            }
        }
        if (!updated)
            this.state.columnDefs.push(columnDef);
        if (data) {
            this.props.data = data;
            this.state.rootNode = createTree(this.props);
        } else
            recursivelyAggregateNodes(this.state.rootNode, this.props);
        this.setState({rootNode: this.state.rootNode});
    },
    redoPresort: function () {
        if (this.props.presort) {
            var colDefToSort;
            for (var colTag in this.props.presort) {
                for (var i = 0; i < this.props.columnDefs.length; i++) {
                    if (this.props.columnDefs[i].colTag === colTag) {
                        colDefToSort = this.props.columnDefs[i];
                        if (this.props.presort[colTag] === 'asc')
                            this.handleSort(colDefToSort, true);
                        else if (this.props.presort[colTag] === 'desc')
                            this.handleSort(colDefToSort, false);
                        break;
                    }
                }
            }
        }
    },
    replaceData: function (data, stopPresort) {
        this.props.data = data;
        var rootNode = createTree(this.props);
        this.setState({
            rootNode: rootNode,
            currentPage: 1,
            sortAsc: undefined,
            columnDefSorted: undefined,
            filterInPlace: {}
        });
        this.props.currentSortStates = [];
        var table = this;
        if (!stopPresort) {
            setTimeout(function () {
                table.redoPresort();
            });
        }
    },
    setStyleByKey: function (key, style) {
        this.state.extraStyle[key] = style;
        this.setState({
            extraStyle: this.state.extraStyle
        });
    },
    handleScroll: function (e) {
        var target = $(e.target);
        var scrolled = target.scrollTop();
        var scrolledHeight = target.height();
        var totalHeight = target.find("tbody").height();
        if (scrolled / (totalHeight - scrolledHeight) > .8) {
            this.setState({
                rows: this.addMoreRows(true)
            });
        }
    },
    /* ----------------------------------------- */

    componentDidMount: function () {
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
        var table = this;
        setTimeout(function () {
            table.redoPresort();
        });
    },
    componentWillMount: function () {
    },
    componentWillUnmount: function () {
        window.removeEventListener('resize', adjustHeaders.bind(this));
        $(this.getDOMNode()).find(".rt-scrollable").get(0).removeEventListener('scroll', this.handleScroll);
    },
    componentDidUpdate: function () {
        adjustHeaders.call(this);
        bindHeadersToMenu($(this.getDOMNode()));
    },
    addMoreRows: function (calledFromScroll) {
        if (this.props.justAdded) {
            this.props.justAdded = false;
            return this.state.rows;
        }
        var rasterizedData = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: this.state.columnDefs[0],
            selectedDetailRows: this.state.selectedDetailRows
        });

        if (!calledFromScroll)
            this.props.rowMultiplier = this.props.rowMultiplier ? this.props.rowMultiplier : 0;
        else
            this.props.rowMultiplier = (this.props.rowMultiplier === undefined ? 0 : this.props.rowMultiplier + 1);

        var upperBound = (this.props.rowMultiplier + 1) * this.state.itemsPerScroll;
        var rowsToDisplay = [];

        if (calledFromScroll && this.state.rows.length < upperBound && this.state.rows.length < rasterizedData.length) {
            var lowerBound = this.state.rows.length;
            rowsToDisplay = rasterizedData.slice(lowerBound, upperBound);
            this.props.justAdded = true;
            return this.state.rows.concat(rowsToDisplay.map(rowMapper, this))
        }
        else {
            rowsToDisplay = rasterizedData.slice(0, upperBound);
            return rowsToDisplay.map(rowMapper, this)
        }
    },
    render: function () {
        var rasterizedData = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: this.state.columnDefs[0],
            selectedDetailRows: this.state.selectedDetailRows
        });

        var paginationAttr = _getPageArithmetics(this, rasterizedData);

        if (this.props.disableInfiniteScrolling) {
            var rowsToDisplay = rasterizedData.slice(paginationAttr.lowerVisualBound, paginationAttr.upperVisualBound + 1);
            this.state.rows = rowsToDisplay.map(rowMapper, this);
        }
        else
            this.state.rows = this.addMoreRows();

        var headers = buildHeaders(this);
        var footer = buildFooter(this, paginationAttr);

        var containerStyle = {};
        if (this.state.height && parseInt(this.state.height) > 0)
            containerStyle.height = this.state.height;

        if (this.props.disableScrolling)
            containerStyle.overflowY = "hidden";

        return (
            React.DOM.div({id: this.state.uniqueId, className: "rt-table-container"}, 
                headers, 
                React.DOM.div({style: containerStyle, className: "rt-scrollable"}, 
                    InfiniteScroll({
                        loadMore: this.addMoreRows, 
                        hasMore: this.state.hasMore}, 
                        React.DOM.table({className: "rt-table"}, 
                            React.DOM.tbody(null, 
                            this.state.rows
                            )
                        )
                    )
                ), 
                this.props.disableInfiniteScrolling ? footer : null
            )
        );
    }
});

/**
 * Represents a row in the table, built from cells
 */
var Row = React.createClass({displayName: 'Row',
    render: function () {
        var cells = [buildFirstCellForRow.call(this)];
        for (var i = 1; i < this.props.columnDefs.length; i++) {
            var columnDef = this.props.columnDefs[i];
            var displayInstructions = buildCellLookAndFeel(columnDef, this.props.data);
            var cx = React.addons.classSet;
            var classes = cx(displayInstructions.classes);
            var displayContent = displayInstructions.value;

            // convert and format dates
            if (columnDef && columnDef.format && columnDef.format.toLowerCase() === "date") {
                if (typeof displayContent === "number") // if displayContent is a number, we assume displayContent is in milliseconds
                    displayContent = new Date(displayContent).toLocaleDateString();
            }
            // determine cell content, based on whether a cell templating callback was provided
            if (columnDef.cellTemplate)
                displayContent = columnDef.cellTemplate.call(this, this.props.data, columnDef, displayContent);
            cells.push(
                React.DOM.td({
                    className: classes, 
                    onClick: columnDef.onCellSelect ? columnDef.onCellSelect.bind(this, this.props.data[columnDef.colTag], columnDef, i) : null, 
                    onContextMenu: this.props.onRightClick ? this.props.onRightClick.bind(null, this.props.data, columnDef) : null, 
                    style: displayInstructions.styles, 
                    key: columnDef.colTag, 
                    onDoubleClick: this.props.filtering && this.props.filtering.doubleClickCell ?
                                   this.props.handleColumnFilter(null, columnDef) : null}, 
                    displayContent
                )
            );
        }
        var cx = React.addons.classSet;
        var classes = cx({
            'selected': this.props.isSelected && this.props.data.isDetail,
            'summary-selected': this.props.isSelected && !this.props.data.isDetail
        });
        var styles = {
            "cursor": "pointer"
        };
        for (var attrname in this.props.extraStyle) {
            styles[attrname] = this.props.extraStyle[attrname];
        }
        return (React.DOM.tr({onClick: this.props.onSelect.bind(null, this.props.data), 
                    className: classes, style: styles}, cells));
    }
});

var PageNavigator = React.createClass({displayName: 'PageNavigator',
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
                React.DOM.li({key: item, className: self.props.activeItem == item ? 'active' : ''}, 
                    React.DOM.a({onClick: self.handleClick.bind(null, item)}, item)
                )
            )
        });
        return (
            React.DOM.ul({className: prevClass, className: "pagination pull-right"}, 
                React.DOM.li({className: nextClass}, 
                    React.DOM.a({className: prevClass, 
                       onClick: this.props.handleClick.bind(null, this.props.activeItem - 1)}, "«")
                ), 
                items, 
                React.DOM.li({className: nextClass}, 
                    React.DOM.a({className: nextClass, 
                       onClick: this.props.handleClick.bind(null, this.props.activeItem + 1)}, "»")
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
    handleKeyPress: function (event) {
        if (event.charCode == 13) {
            event.preventDefault();
            this.props.table.handleGroupBy(this.props.columnDef, this.state.userInputBuckets);
        }
    },
    handleClick: function (event) {
        var $node = $(this.getDOMNode());
        $node.children(".menu-item-input").children("input").focus();
    },
    render: function () {
        var table = this.props.table, columnDef = this.props.columnDef;
        var subMenuAttachment = columnDef.format == "number" || columnDef.format == "currency" ?
            (
                React.DOM.div({className: "menu-item-input", style: {"position": "absolute", "top": "-50%", "right": "100%"}}, 
                    React.DOM.label({style: {"display": "block"}}, "Enter Bucket(s)"), 
                    React.DOM.input({tabIndex: "1", onKeyPress: this.handleKeyPress, onChange: this.handleChange, 
                           placeholder: "ex: 1,10,15"}), 
                    React.DOM.a({tabIndex: "2", style: {"display": "block"}, 
                       onClick: table.handleGroupBy.bind(null, columnDef, this.state.userInputBuckets), 
                       className: "btn-link"}, "Ok")
                )
            ) : null;
        return (
            React.DOM.div({
                onClick: subMenuAttachment == null ? table.handleGroupBy.bind(null, columnDef, null) : this.handleClick, 
                style: {"position": "relative"}, className: "menu-item menu-item-hoverable"}, 
                React.DOM.div(null, "Summarize"), 
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

function rowMapper(row) {
    var rowKey = this.props.rowKey;
    var generatedKey = generateRowKey(row, rowKey);
    return (Row({
        key: generatedKey, 
        data: row, 
        extraStyle: _getExtraStyle(generatedKey, this.state.extraStyle), 
        isSelected: _isRowSelected(row, this.props.rowKey, this.state.selectedDetailRows, this.state.selectedSummaryRows), 
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
};

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _isRowSelected(row, rowKey, selectedDetailRows, selectedSummaryRows) {
    if (rowKey == null)
        return;
    return selectedDetailRows[row[rowKey]] != null || (!row.isDetail && selectedSummaryRows[generateSectorKey(row.sectorPath)] != null);
}

function _getExtraStyle(geenratedKey, extraStyles) {
    return geenratedKey && extraStyles ? extraStyles[geenratedKey] : null;
}

function _getPageArithmetics(table, data) {
    var result = {};

    if (table.props.disablePagination) {
        result.lowerVisualBound = 0, result.upperVisualBound = data.length
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
        result.pageDisplayRange = _computePageDisplayRange(table.state.currentPage, result.maxDisplayedPages);

        result.lowerVisualBound = (table.state.currentPage - 1) * result.pageSize;
        result.upperVisualBound = Math.min(table.state.currentPage * result.pageSize - 1, data.length);
    }

    return result;

}

function _computePageDisplayRange(currentPage, maxDisplayedPages) {
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
;function ReactTableGetInitialState() {
    // the holy grail of table state - describes structure of the data contained within the table
    var rootNode = createTree(this.props);
    var selections = _getInitialSelections(this.props.selectedRows, this.props.selectedSummaryRows);
    // FILTERING NOT READY****************
    //this.props.filtering = {disable: true};
    // ******************
    return {
        rootNode: rootNode,
        uniqueId: uniqueId("table"),
        currentPage: 1,
        height: this.props.height,
        columnDefs: this.props.columnDefs,
        selectedDetailRows: selections.selectedDetailRows,
        selectedSummaryRows: selections.selectedSummaryRows,
        firstColumnLabel: _construct1StColumnLabel(this),
        extraStyle: {},
        rows: [],
        hasMoreRows: false,
        itemsPerScroll: this.props.itemsPerScroll ? this.props.itemsPerScroll : 100,
        filterInPlace: {},
        currentFilters: []
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

function ReactTableHandleColumnFilter(columnDefToFilterBy, e, dontSet){
    if( typeof dontSet !== "boolean" )
        dontSet = undefined;

    var filterData = e.target ? (e.target.value || e.target.textContent) : e;
    var caseSensitive = !(this.props.filtering && this.props.filtering.caseSensitive === false);

    if( !dontSet ){
        // Find if this column has already been filtered.  If it is, we need to remove it before filtering again
        for(var i=0; i<this.state.currentFilters.length; i++){
            if( this.state.currentFilters[i].colDef === columnDefToFilterBy ) {
                this.state.currentFilters.splice(i,1);
                this.handleClearFilter(columnDefToFilterBy, true);
                break;
            }
        }
    }

    var customFilterer;
    if( this.props.filtering && this.props.filtering.customFilterer ){
        customFilterer = this.props.filtering.customFilterer;
    }
    this.state.rootNode.filterByColumn(columnDefToFilterBy, filterData, caseSensitive, customFilterer);

    if( !dontSet ) {
        this.state.currentFilters.push({colDef: columnDefToFilterBy, filterText: filterData});
        $("input.rt-" + columnDefToFilterBy.colTag + "-filter-input").val(filterData);
        this.setState({rootNode: this.state.rootNode, currentFilters: this.state.currentFilters});
    }
}

function ReactTableHandleRemoveFilter(colDef, dontSet) {
    if( typeof dontSet !== "boolean" )
        dontSet = undefined;

    // First clear out all filters
    for(var i=0; i<this.state.rootNode.ultimateChildren.length; i++){
        this.state.rootNode.ultimateChildren[i].hiddenByFilter = false;
    }
    // Remove filter from list of current filters
    for(i=0; i<this.state.currentFilters.length; i++){
        if( this.state.currentFilters[i].colDef === colDef ) {
            this.state.currentFilters.splice(i,1);
            break;
        }
    }
    // Re-filter by looping through old filters
    for(i=0; i<this.state.currentFilters.length; i++){
        this.handleColumnFilter(this.state.currentFilters[i].colDef, this.state.currentFilters[i].filterText, true);
    }

    if( !dontSet ) {
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

function recursivelyClearFilters(node){
    node.clearFilter();

    for( var i=0; i<node.children.length; i++ ){
        recursivelyClearFilters(node.children[i]);
    }

    if( !node.hasChild() ) {
        for (var i = 0; i < node.ultimateChildren.length; i++) {
            node.ultimateChildren[i].hiddenByFilter = false;
        }
    }
}

function reApplyAllFilters(){
    for( var i=0; i<this.state.currentFilters.length; i++ ){
        this.handleColumnFilter(this.state.currentFilters[i].colDef, this.state.currentFilters[i].filterText, true);
    }
    this.setState({rootNode: this.state.rootNode});
}

function ReactTableHandleSort(columnDefToSortBy, sortAsc) {
    var sortFn = getSortFunction(columnDefToSortBy).bind(columnDefToSortBy);
    var reverseSortFn = getReverseSortFunction(columnDefToSortBy).bind(columnDefToSortBy);
    this.state.rootNode.sortChildren({
        sortFn: sortFn,
        reverseSortFn: reverseSortFn,
        recursive: true,
        sortAsc: sortAsc
    });
    this.props.currentSortStates = [sortAsc ? sortFn : reverseSortFn];
    this.setState({rootNode: this.state.rootNode, sortAsc: sortAsc, columnDefSorted: columnDefToSortBy, filterInPlace: {}});
}

function ReactTableHandleAddSort(columnDefToSortBy, sortAsc) {
    // If it's not sorted yet, sort normally
    if( !this.props.currentSortStates || this.props.currentSortStates.length == 0 ) {
        this.handleSort(columnDefToSortBy, sortAsc);
        return;
    }
    var sortFn = getSortFunction(columnDefToSortBy).bind(columnDefToSortBy);
    var reverseSortFn = getReverseSortFunction(columnDefToSortBy).bind(columnDefToSortBy);
    this.state.rootNode.addSortToChildren({
        sortFn: sortFn,
        reverseSortFn: reverseSortFn,
        recursive: true,
        sortAsc: sortAsc,
        oldSortFns: this.props.currentSortStates
    });
    this.props.currentSortStates.push(sortAsc ? sortFn : reverseSortFn);
    this.setState({rootNode: this.state.rootNode, sortAsc: sortAsc, columnDefSorted: columnDefToSortBy, filterInPlace: {}});
}

function ReactTableHandleGroupBy(columnDef, buckets) {

    if (buckets != null && buckets != "" && columnDef)
        columnDef.groupByRange = _createFloatBuckets(buckets);
    if (columnDef != null) {
        this.props.groupBy = this.props.groupBy || [];
        this.props.groupBy.push(columnDef);
    } else
        this.props.groupBy = null;

    this.state.rootNode = createTree(this.props);

    if( this.state.currentFilters.length > 0 ) {
        reApplyAllFilters.call(this);
    }

    this.setState({
        rootNode: this.state.rootNode,
        currentPage: 1,
        firstColumnLabel: _construct1StColumnLabel(this)
    });


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
    this.setState({rootNode: this.state.rootNode});
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
}

function _construct1StColumnLabel(table) {
    var result = [];
    if (table.props.groupBy) {
        for (var i = 0; i < table.props.groupBy.length; i++)
            result.push(table.props.groupBy[i].text);
    }
    result.push(table.props.columnDefs[0].text);
    return result;
}

function _getInitialSelections(selectedRows, selectedSummaryRows) {
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
;function genericValueBasedSorter(a, b) {
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

function dateDetailReverseSort(a, b) {
    var returnValue = new Date(b[this.colTag]) - new Date(a[this.colTag]);
    return returnValue;
}

function getSortFunction(sortByColumnDef) {
    var format = sortByColumnDef.format || "";
    // if the user provided a custom sort function for the column, use that instead
    if (sortByColumnDef.sort)
        return sortByColumnDef.sort;
    switch (format.toLowerCase()) {
        case "date":
            return dateDetailSort;
        default :
            return genericValueBasedSorter;
    }
}

function getReverseSortFunction(sortByColumnDef) {
    var format = sortByColumnDef.format || "";
    if (sortByColumnDef.reverseSort)
        return sortByColumnDef.reverseSort;
    else if(sortByColumnDef.sort){
        return function(a,b){
            return sortByColumnDef.sort.bind(this)(a,b)*-1;
        }
    }
    if (!sortByColumnDef.sort) {
        switch (format.toLowerCase()) {
            case "date":
                return dateDetailReverseSort;
            default :
                return genericValueBasedReverseSorter;
        }
    }
}



;/**
 * Transform the current props into a tree structure representing the complex state
 * @param tableProps
 * @return the root TreeNode element of the tree with aggregation
 */
function createTree(tableProps) {
    // If the rootNode is passed as a prop - that means the tree is pre-configured
    if (tableProps.rootNode != null) {
        return tableProps.rootNode
    }
    // If the data is formatted as an array of arrays instead of array of objects
    if( tableProps.data.length > 0 && Array.isArray(tableProps.data[0]) ){
        for( var i=0; i<tableProps.data.length; i++ ){
            var newDataObj = {};
            for( var j=0; j<tableProps.columnDefs.length; j++ ){
                newDataObj[tableProps.columnDefs[j].colTag] = tableProps.data[i][j];
            }
            tableProps.data[i] = newDataObj;
        }
    }
    var rootNode = buildTreeSkeleton(tableProps);
    recursivelyAggregateNodes(rootNode, tableProps);
    rootNode.sortRecursivelyBySortIndex();
    rootNode.foldSubTree();
    return rootNode;
}

/**
 * Creates the data tree backed by props.data and grouped columns specified in groupBy
 * @param tableProps
 * @return {TreeNode} the root node
 */
function buildTreeSkeleton(tableProps) {
    var rootNode = new TreeNode("Grand Total", null), rawData = tableProps.data, i;
    if (tableProps.disableGrandTotal)
        rootNode.display = false
    for (i = 0; i < rawData.length; i++) {
        rootNode.appendUltimateChild(rawData[i]);
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
        currentNode = currentNode.appendRowToChildren({
            childSectorName: result.sectorName,
            childRow: row,
            sortIndex: result.sortIndex,
            groupByColumnDef: groupBy[i]
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
    this.groupByColumnDef = {};
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
    var childSectorName = options.childSectorName, childRow = options.childRow, sortIndex = options.sortIndex, groupByColumnDef = options.groupByColumnDef;
    // create a new child node if one by the current sector name does not exist
    if (this._childrenSectorNameMap[childSectorName] == null) {
        var child = new TreeNode(childSectorName, this);
        child.sortIndex = sortIndex;
        child.groupByColumnDef = groupByColumnDef;
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

TreeNode.prototype.sortChildren = function (options) {
    var sortFn = options.sortFn, reverseSortFn = options.reverseSortFn,
        recursive = options.recursive, sortAsc = options.sortAsc;

    var multiplier = sortAsc == true ? 1 : -1;
    this.children.sort(function (a, b) {
        var aRow = a.rowData, bRow = b.rowData;
        if( !reverseSortFn || multiplier === 1 )
            return multiplier * sortFn(aRow, bRow);
        else
            return reverseSortFn(aRow, bRow);
    });
    if (!this.hasChild())
        this.ultimateChildren.sort(function (a, b) {
            if( !reverseSortFn || multiplier === 1 )
                return multiplier * sortFn(a, b);
            else
                return reverseSortFn(a, b);
        });

    if (recursive) {
        for (var i = 0; i < this.children.length; i++)
            this.children[i].sortChildren({sortFn: sortFn, reverseSortFn: options.reverseSortFn,
                                            recursive: recursive, sortAsc: sortAsc});
    }
};

TreeNode.prototype.addSortToChildren = function (options) {
    var sortFn = options.sortFn, reverseSortFn = options.reverseSortFn,
        oldSortFns = options.oldSortFns,
        recursive = options.recursive, sortAsc = options.sortAsc;

    var multiplier = sortAsc == true ? 1 : -1;
    var childrenToAddSort = [];

    for( var i=0; i+1<this.children.length; i++ ){
        transformSortCandidates(this.children, i, true, i+2>=this.children.length);
    }

    if( !this.hasChild() ) {
        for (var i = 0; i + 1 < this.ultimateChildren.length; i++) {
            transformSortCandidates(this.ultimateChildren, i, false, i+2>=this.ultimateChildren.length);
        }
    }

    if (recursive) {
        for (var i = 0; i < this.children.length; i++)
            this.children[i].addSortToChildren(options);
    }

    function transformSortCandidates(nodes, i, isChild, lastElement){
        if( childrenToAddSort.length == 0 )
            childrenToAddSort.push( $.extend( {}, nodes[i] ) );

        var tieFound = true;
        for( var j=0; j<oldSortFns.length; j++ ){
            if( oldSortFns[j](extractData(nodes[i], isChild), extractData(nodes[i+1], isChild)) !== 0 ){
                tieFound = false;
                break;
            }
        }
        if( tieFound && !lastElement ){
            childrenToAddSort.push( $.extend( {}, nodes[i+1] ) );
        }
        else if( childrenToAddSort.length > 1 ){
            if( lastElement )
                childrenToAddSort.push( $.extend( {}, nodes[i+1] ) );
            // Sort next level
            childrenToAddSort.sort(function (a, b) {
                if( !reverseSortFn || multiplier === 1 )
                    return multiplier * sortFn(extractData(a, isChild), extractData(b, isChild));
                else
                    return reverseSortFn(extractData(a, isChild), extractData(b, isChild));
            });
            // Replace ultimate children with correct next level of sorting
            for( var ii=0; ii<childrenToAddSort.length; ii++ ){
                var childIndexToReplace = i + ii + 1 - (childrenToAddSort.length);
                nodes[childIndexToReplace] = childrenToAddSort[ii];
            }
            childrenToAddSort = [];
        }
        else{
            childrenToAddSort = [];
        }
    }

    function extractData(obj, isChild){
        return isChild ? obj.rowData : obj;
    }
};

TreeNode.prototype.filterByColumn = function(columnDef, textToFilterBy, caseSensitive, customFilterer){
    if( columnDef.format === "number" )
        this.filterByNumericColumn(columnDef, textToFilterBy);
    else
        this.filterByTextColumn(columnDef, textToFilterBy, caseSensitive, customFilterer);
};

TreeNode.prototype.filterByTextColumn = function(columnDef, textToFilterBy, caseSensitive, customFilterer){
    // Filter aggregations
    for( var i=0; i<this.children.length; i++ ){
        // Call recursively to filter leaf nodes first
        this.children[i].filterByColumn(columnDef, textToFilterBy, caseSensitive, customFilterer);
        // Check to see if all children are hidden, then hide parent if so
        var allChildrenHidden = true;
        for( var j=0; j<this.children[i].ultimateChildren.length; j++ ){
            if( !this.children[i].ultimateChildren[j].hiddenByFilter ){
                allChildrenHidden = false;
                break;
            }
        }
        this.children[i].hiddenByFilter = allChildrenHidden;
    }
    if( !this.hasChild() ) {
        for (var i = 0; i < this.ultimateChildren.length; i++) {
            var uChild = this.ultimateChildren[i];
            if( customFilterer ){
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

TreeNode.prototype.filterByNumericColumn = function(columnDef, filterData){
    // Filter aggregations
    for( var i=0; i<this.children.length; i++ ){
        // Call recursively to filter leaf nodes first
        this.children[i].filterByNumericColumn(columnDef, filterData);
        // Check to see if all children are hidden, then hide parent if so
        var allChildrenHidden = true;
        for( var j=0; j<this.children[i].ultimateChildren.length; j++ ){
            if( !this.children[i].ultimateChildren[j].hiddenByFilter ){
                allChildrenHidden = false;
                break;
            }
        }
        this.children[i].hiddenByFilter = allChildrenHidden;
    }
    if( !this.hasChild() ) {
        for (var i = 0; i < this.ultimateChildren.length; i++) {
            var uChild = this.ultimateChildren[i];
            var row = {};
            row[columnDef.colTag] = uChild[columnDef.colTag];
            var filterOutNode = false;
            var multiplier = buildLAFConfigObject(columnDef).multiplier;
            var value = row[columnDef.colTag]*parseFloat(multiplier);
            for( var j=0; j<filterData.length; j++ ){
                if( filterData[j].gt !== undefined ){
                    if( !(value > filterData[j].gt) )
                        filterOutNode = true;
                }
                else if( filterData[j].lt !== undefined ){
                    if( !(value < filterData[j].lt) )
                        filterOutNode = true;
                }
                else if( filterData[j].eq !== undefined ) {
                    if( !(value == filterData[j].eq) )
                        filterOutNode = true;
                }
            }

            uChild.hiddenByFilter = filterOutNode;
        }
    }
};

TreeNode.prototype.clearFilter = function(){
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
};/**
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