/** @jsx React.DOM */
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
