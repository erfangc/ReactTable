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
    if (row[columnDef.colTag]) {
        if (!row.isDetail && (!isNaN(row[columnDef.colTag]) || !isNaN((row[columnDef.colTag]).replace(/,/g, ""))))
            return "right";
    }

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
    var value = row[columnDef.colTag] || ""; // avoid undefined

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

    if (columnDef.format === 'date')
        value = convertDateNumberToString(columnDef, value);

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

function clickFilterMenu(table, columnDef) {
    if (!(table.props.filtering && table.props.filtering.disable)) {
        toggleFilterBox.call(table, table, columnDef);
        table.setState({});
    }
}

function clickFilterSearch(table, columnDef) {
    if (!(table.props.filtering && table.props.filtering.disable)) {
        toggleSearchBox.call(table, table, columnDef);
        table.setState({});
    }
}

function toggleSearchBox(table, columnDef) {
    var sip = table.state.searchInPlace;
    //open current filter drop down, close others
    sip[columnDef.colTag] = !sip[columnDef.colTag];
    for (var key in sip) {
        if (key !== columnDef.colTag) {
            sip[key] = false;
        }
    }

    table.setState({
        searchInPlace: sip
    });

    setTimeout(function (sip) {
        if (!sip[columnDef.colTag]) {
            return;
        }
        //move filter panel to right position
        var $header = $(this.refs["header-" + columnDef.colTag].getDOMNode());
        var headerPosition = $header.position();

        var $filterDropDown = $(this.refs['search-filter-' + columnDef.colTag].getDOMNode());

        if (headerPosition.left !== 0) {
            $filterDropDown.css("left", headerPosition.left + "px");
        }
        if (headerPosition.right !== 0) {
            $filterDropDown.css("right", headerPosition.right + "px");
        }
    }.bind(this, sip));
}

function buildMenu(options) {
    var table = options.table,
        columnDef = options.columnDef,
        style = options.style,
        isFirstColumn = options.isFirstColumn, menuStyle = {};

    const subMenuStyles = {
        "top": "-20%",
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
            React.createElement(SubMenu, {onMenuClick: table.handleSetSort.bind(null, columnDef, null), table: table, 
                menuItem: React.createElement("span", null, 
                    React.createElement("i", {className: "fa fa-sort"}), 
                "Sort"), subMenu: 
                React.createElement("div", {className: "rt-header-menu", style: subMenuStyles}, 
                    React.createElement("div", {className: "menu-item", onClick: table.handleSetSort.bind(null, columnDef, 'asc')}, 
                        React.createElement("i", {className: "fa fa-sort-alpha-asc"}), 
                    "Asc"
                    ), 
                    React.createElement("div", {className: "menu-item", onClick: table.handleSetSort.bind(null, columnDef, 'desc')}, 
                        React.createElement("i", {className: "fa fa-sort-alpha-desc"}), 
                    "Desc"
                    ), 
                    React.createElement("div", {className: "separator"}), 
                    React.createElement("div", {className: "menu-item", onClick: table.handleAddSort.bind(null, columnDef, 'asc')}, 
                        React.createElement("i", {className: "fa fa-plus"}), 
                        React.createElement("i", {className: "fa fa-sort-alpha-asc"}), 
                    "Add Asc"
                    ), 
                    React.createElement("div", {className: "menu-item", onClick: table.handleAddSort.bind(null, columnDef, 'desc')}, 
                        React.createElement("i", {className: "fa fa-plus"}), 
                        React.createElement("i", {className: "fa fa-sort-alpha-desc"}), 
                    "Add Desc"
                    ), 
                    React.createElement("div", {className: "separator"}), 
                    React.createElement("div", {className: "menu-item", onClick: table.clearSort}, 
                        React.createElement("i", {className: "fa fa-ban"}), 
                    "Clear All Sort")
                )}
            )
        ],
        filter: [
            React.createElement(SubMenu, {table: table, 
                menuItem: React.createElement("span", null, 
                    React.createElement("i", {className: "fa fa-filter"}), 
                "Filter"), 
                subMenu: 
                    React.createElement("div", {className: "rt-header-menu", style: subMenuStyles}, 
                        React.createElement("div", {className: "menu-item", onClick: clickFilterMenu.bind(null, table, columnDef)}, 
                            React.createElement("i", {className: "fa fa-filter"}), " Filter"), 
                        columnDef.format == 'number' ?'': React.createElement("div", {className: "menu-item", onClick: clickFilterSearch.bind(null, table, columnDef)}, 
                            React.createElement("i", {className: "fa fa-search"}), " Search"), 
                        React.createElement("div", {className: "separator"}), 
                        React.createElement("div", {className: "menu-item", onClick: table.handleClearFilter.bind(null, columnDef)}, "Clear Filter"), 
                        React.createElement("div", {className: "menu-item", onClick: table.handleClearAllFilters}, "Clear All Filters")
                    )
                    }
            )
        ],
        summarize: [
            React.createElement(SubMenu, {table: table, 
                onMenuClick: columnDef.format == 'number' || columnDef == 'currency' ? null : table.handleSubtotalBy.bind(null, columnDef, null), 
                menuItem: React.createElement("span", null, 
                    React.createElement("i", {className: "fa fa-list-ul"}), 
                "Subtotal"), 
                subMenu: columnDef.format == DATE_FORMAT && columnDef.formatInstructions != null ?
                    React.createElement("div", {className: "rt-header-menu", style: subMenuStyles}, 
                        React.createElement(SubtotalControl, {table: table, columnDef: columnDef}), 
                        React.createElement(SubtotalControlForDates, {freq: DAILY, table: table, columnDef: columnDef}), 
                        React.createElement(SubtotalControlForDates, {freq: WEEKLY, table: table, columnDef: columnDef}), 
                        React.createElement(SubtotalControlForDates, {freq: MONTHLY, table: table, columnDef: columnDef}), 
                        React.createElement(SubtotalControlForDates, {freq: QUARTERLY, table: table, columnDef: columnDef}), 
                        React.createElement(SubtotalControlForDates, {freq: YEARLY, table: table, columnDef: columnDef}), 
                        React.createElement("div", {className: "menu-item", onClick: table.handleClearSubtotal}, 
                            React.createElement("i", {className: "fa fa-ban"}), 
                        "Clear All Subtotal")
                    ) :
                    React.createElement("div", {className: "rt-header-menu", style: subMenuStyles}, 
                        React.createElement(SubtotalControl, {table: table, columnDef: columnDef}), 
                        React.createElement("div", {className: "menu-item", onClick: table.handleClearSubtotal}, 
                            React.createElement("i", {className: "fa fa-ban"}), 
                        "Clear All Subtotal")
                    )
                    
            }
            )
        ],

        summarizeClearAll: [
            React.createElement(SubMenu, {table: table, 
                menuItem: React.createElement("span", null, 
                    React.createElement("i", {className: "fa fa-list-ul"}), 
                "Subtotal"), 
                subMenu: 
                    React.createElement("div", {className: "rt-header-menu", style: subMenuStyles}, 
                        React.createElement("div", {className: "menu-item", onClick: table.handleClearSubtotal}, 
                            React.createElement("i", {className: "fa fa-ban"}), 
                        "Clear All Subtotal")
                    )
                    })
        ],
        remove: [
            React.createElement("div", {className: "menu-item", onClick: table.handleRemove.bind(null, columnDef)}, 
                React.createElement("i", {
                    className: "fa fa-remove"}), 
            "Remove Column")
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
        if (!isFirstColumn || table.state.subtotalBy.length == 0) {
            addMenuItems(menuItems, availableDefaultMenuItems.summarize);
        } else {
            //if first column is the subtotal column, don't add 'addSubtotal'
            addMenuItems(menuItems, availableDefaultMenuItems.summarizeClearAll);
        }
        if (!isFirstColumn && !table.props.disableRemoveColumn) {
            menuItems.push(React.createElement("div", {className: "separator"}));
            addMenuItems(menuItems, availableDefaultMenuItems.remove);
        }

    }

    var customMenuItems = buildCustomMenuItems(table, columnDef);
    menuItems.push(customMenuItems);

    if (isFirstColumn) {
        menuItems.push(React.createElement("div", {className: "separator"}));
        if (!table.props.disableExporting) {
            menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleDownload.bind(null, "excel")}, 
                React.createElement("i", {
                    className: "fa fa-file-excel-o"}), 
            "Download as XLS"));

            if (!table.props.disableDownloadPDF) {
                menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleDownload.bind(null, "pdf")}, 
                    React.createElement("i", {className: "fa fa-file-pdf-o"}), 
                "Download as PDF"));
            }
        }

        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleCollapseAll}, "Collapse" + ' ' +
        "All"));
        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleExpandAll}, "Expand All"));
    }

    return (
        React.createElement("div", {style: menuStyle, className: ("rt-header-menu") + (table.state.filterInPlace[columnDef.colTag] || table.state.searchInPlace[columnDef.colTag] ? " rt-hide" : "")}, 
            menuItems
        )
    );
}

function addMenuItems(master, children) {
    for (var j = 0; j < children.length; j++)
        master.push(children[j])
}

function toggleFilterBox(table, columnDef) {
    var fip = table.state.filterInPlace;
    //open current filter drop down, close others
    fip[columnDef.colTag] = !fip[columnDef.colTag];
    for (var key in fip) {
        if (key !== columnDef.colTag) {
            fip[key] = false;
        }
    }

    table.setState({
        filterInPlace: fip
    });

    setTimeout(function (fip) {
        if (!fip[columnDef.colTag]) {
            return;
        }

        //move filter panel to right position
        var $header = $(this.refs["header-" + columnDef.colTag].getDOMNode());
        var headerPosition = $header.position();
        var $filterDropDown = null;

        if (columnDef.format == 'number') {
            $filterDropDown = $(this.refs["numericFilterPanel-" + columnDef.colTag].getDOMNode());
        } else {
            $filterDropDown = $(this.refs['select-filter-' + columnDef.colTag].getDOMNode())
        }

        if (headerPosition.left !== 0) {
            $filterDropDown.css("left", headerPosition.left + "px");
        }
        if (headerPosition.right !== 0) {
            $filterDropDown.css("right", headerPosition.right + "px");
        }
    }.bind(this, fip));
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

function pressedKeyInSearch(table, colTag, e) {
    const ESCAPE = 27;
    if (table.state.searchInPlace[colTag] && e.keyCode == ESCAPE) {
        table.state.searchInPlace[colTag] = false;
        table.setState({
            searchInPlace: table.state.searchInPlace
        });
    }
}

function selectFilters(table, columnDefToFilterBy, e) {
    table.state.selectedFilters = $(e.target).val();
    table.setState({});
    table.handleColumnFilter.call(null, columnDefToFilterBy);
}

function addFilter(table, columnDef, event) {
    var filterValue = event.target.value;

    var filterData = null;
    var isAdded = false;
    table.state.currentFilters.forEach(function (filter) {
        if (filter.colDef === columnDef) {
            isAdded = filter.filterText.some(function (addedFilter) {
                return addedFilter === filterValue;
            });

            if (!isAdded) {
                filter.filterText.push(filterValue);
                filterData = filter.filterText;
            }
        }
    });

    if (isAdded) {
        return;
    }

    if (!filterData) {
        table.state.currentFilters.push({
            colDef: columnDef,
            filterText: [filterValue]
        });
        filterData = [filterValue];
    }

    table.setState({});
}

function search(table, columnDef) {
    var filterData = null;
    table.state.currentFilters.forEach(function (filter) {
        if (filter.colDef === columnDef) {
            filterData = filter.filterText;
        }
    });

    columnDef.isFiltered = true;
    columnDef.isSearchText = true;
    table.state.searchInPlace[columnDef.colTag] = false;
    table.handleColumnFilter.call(null, columnDef, filterData);
    columnDef.isSearchText = false;

    //hide filter dropdown
    $(this.refs['search-filter-' + columnDef.colTag].getDOMNode()).addClass('rt-hide');
}

function filter(table, columnDef) {
    var filterData = null;
    table.state.currentFilters.forEach(function (filter) {
        if (filter.colDef === columnDef) {
            filterData = filter.filterText;
        }
    });

    columnDef.isFiltered = true;
    table.state.filterInPlace[columnDef.colTag] = false;
    table.handleColumnFilter.call(null, columnDef, filterData);

    //hide filter dropdown
    $(this.refs['select-filter-' + columnDef.colTag].getDOMNode()).addClass('rt-hide');
}

function removeFilter(table, columnDef, index, event) {
    event.preventDefault();

    table.state.currentFilters.forEach(function (filter) {
        if (filter.colDef === columnDef) {
            filter.filterText.splice(index, 1);
            if (filter.filterText.length == 0) {
                table.handleClearFilter(columnDef);
            }
        }
    });

    table.setState({});
}
/**
 * set the search text for filter a column
 * @param table
 * @param columnDef
 * @param event
 */
function changeSearchText(table, columnDef, event) {
    var filterValue = event.target.value;

    if (!filterValue) {
        return;
    }

    var isAdded = false;
    table.state.currentFilters.forEach(function (filter) {
        if (filter.colDef === columnDef) {
            isAdded = true;
            filter.filterText = [filterValue];
        }
    });

    if (!isAdded) {
        table.state.currentFilters.push({
            colDef: columnDef,
            filterText: [filterValue]
        });
    }

    table.setState({});
}

function buildSearchBox(table, columnDef) {

    return (
        React.createElement("div", {className: ("rt-select-filter-container ") + (table.state.searchInPlace[columnDef.colTag] ? "" : " rt-hide"), 
            ref: 'search-filter-' + columnDef.colTag}, 
            React.createElement("div", {style: {display: 'block', marginBottom: '2px'}}, 
                React.createElement("input", {className: "rt-" + columnDef.colTag + "-filter-select rt-filter-select", 
                    onKeyDown: pressedKeyInSearch.bind(null, table, columnDef.colTag), 
                    onChange: changeSearchText.bind(null, table, columnDef)}), 
                React.createElement("i", {style: {float: 'right', 'marginTop': '5px', 'marginRight': '4%'}, 
                    className: "fa fa-search", onClick: search.bind(table, table, columnDef)})
            )
        )
    )
}

/**
 * build filter drop down list
 * @param table
 * @param columnDef
 * @returns {XML}
 */
function buildFilterList(table, columnDef) {
    if (!table.state.filterData) {
        return;
    }

    var filterData = table.state.filterData[columnDef.colTag];
    if (!filterData || (filterData.length == 1 && filterData[0] == 'undefined')) {
        return;
    }
    filterData.sort();
    var filterList = [];
    //if(filterData.length > 1){
    filterList.push(
        React.createElement("option", {value: "default", style: {display: 'none'}})
    );
    //}
    for (var i = 0; i < filterData.length; i++) {
        var label = filterData[i];
        if (columnDef.format == DATE_FORMAT && columnDef.formatInstructions != null) {
            label = moment(parseInt(label)).format(columnDef.formatInstructions)
        }

        filterList.push(
            React.createElement("option", {value: filterData[i]}, label)
        );
    }

    var selectedFilters = [];
    table.state.currentFilters.forEach(function (filter) {
        if (filter.colDef === columnDef) {
            filter.filterText.forEach(function (filter, index) {
                if (columnDef.format == DATE_FORMAT && columnDef.formatInstructions != null) {
                    filter = moment(parseInt(filter)).format(columnDef.formatInstructions)
                }

                selectedFilters.push(
                    React.createElement("div", {style: {display: 'block', marginTop: '2px'}}, 
                        React.createElement("input", {className: "rt-" + columnDef.colTag + "-filter-input rt-filter-input", 
                            type: "text", value: filter, readOnly: true}), 
                        React.createElement("i", {style: {float: 'right', 'marginTop': '5px', 'marginRight': '4%'}, className: "fa fa-minus", 
                            onClick: removeFilter.bind(null, table, columnDef, index)}
                        )
                    )
                )
            });
        }
    });
    return (
        React.createElement("div", {className: ("rt-select-filter-container ") + (table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide"), 
            ref: 'select-filter-' + columnDef.colTag}, 
            React.createElement("div", {style: {display: 'block', marginBottom: '2px'}}, 
                React.createElement("select", {
                    className: "rt-" + columnDef.colTag + "-filter-select rt-filter-select", 
                    onChange: addFilter.bind(null, table, columnDef), 
                    onKeyDown: pressedKey.bind(null, table, columnDef.colTag), 
                    value: filterData.length > 1 ? "default" : filterData[0]}, 
                    filterList
                ), 
                React.createElement("i", {style: {float: 'right', 'marginTop': '5px', 'marginRight': '4%'}, 
                    className: "fa fa-filter", onClick: filter.bind(table, table, columnDef)})
            ), 
            React.createElement("div", {className: ("separator") + ( selectedFilters.length == 0 ? " rt-hide" : "")}), 
            React.createElement("div", {style: {display: 'block'}}, 
                selectedFilters
            )
        )
    )
}


/**
 * creates the header row of the table
 * TODO too long needs refactoring big time I am not kidding
 * @param table
 * @returns {XML}
 */
function buildHeaders(table) {
    var ss = {
        width: "100%",
        height: "13px",
        padding: "0"
    };
    var headerColumns = [];
    for (var i = 0; i < table.state.columnDefs.length; i++) {
        var columnDef = table.state.columnDefs[i];
        if (table.props.hideSubtotaledColumns) {
            var subtotalled = table.state.subtotalBy.some(function (subtotalColumn) {
                return subtotalColumn.colTag === columnDef.colTag;
            });
            if (subtotalled) {
                continue;
            }
        }

        var isFirstColumn = (i === 0);
        /**
         * sortDef tracks whether the current column is being sorted
         */
        var sortDef = findDefByColTag(table.state.sortBy, columnDef.colTag);
        var sortIcon = null;
        if (sortDef) {
            var type = sortDef.sortType === 'asc' ? 'up' : 'down';
            var idx = 0;
            table.state.sortBy.forEach(function (sort, index) {
                if (sort.colTag == columnDef.colTag) {
                    idx = index + 1;
                }
            });
            sortIcon = (React.createElement("span", {style: {marginLeft: '3px'}}, 
                React.createElement("i", {style: {marginTop: '2px'}, className: "fa fa-long-arrow-" + type}), 
                React.createElement("sup", {style: {marginLeft: '2px'}}, idx)
            ));
        }
        var style = {textAlign: "center"};
        var numericPanelClasses = "rt-numeric-filter-container" + (columnDef.format === "number" && table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide");
        var textClasses = "btn-link rt-header-anchor-text";

        // to determine if a column has been filtered. need update accordingly.
        var isFiltered = columnDef.isFiltered ? true : false;

        headerColumns.push(
            React.createElement("div", {className: "rt-headers-container", ref: "header-" + columnDef.colTag}, 
                React.createElement("div", {onDoubleClick: table.handleSetSort.bind(null, columnDef, null), style: style, 
                    className: "rt-header-element rt-info-header", key: columnDef.colTag}, 
                    React.createElement("a", {className: textClasses, 
                        onClick: table.props.filtering && table.props.filtering.disable ? null : toggleFilterBox.bind(table, table, columnDef)}, 
                        buildHeaderLabel(table, columnDef, isFirstColumn), 
                        sortIcon, 
                        React.createElement("i", {style: {marginLeft: '4px'}, className: ("fa fa-filter fa-inverse") + (isFiltered ? "" : " rt-hide")})
                    )
                ), 
                 table.state.filterInPlace[columnDef.colTag] && columnDef.format === "number" ?
                    (React.createElement("div", {className: numericPanelClasses, ref: "numericFilterPanel-" + columnDef.colTag}, 
                        React.createElement(NumericFilterPanel, {clearFilter: table.handleClearFilter, 
                            addFilter: table.handleColumnFilter, 
                            colDef: columnDef, 
                            currentFilters: table.state.currentFilters}
                        )
                    )) : null, 
                table.state.filterInPlace[columnDef.colTag] ? buildFilterList(table, columnDef) : null, 
                table.state.searchInPlace[columnDef.colTag] ? buildSearchBox(table, columnDef) : null, 
                buildMenu({
                    table: table,
                    columnDef: columnDef,
                    style: style,
                    isFirstColumn: isFirstColumn
                })
            )
        );
    }

    var corner;
    var classString = "btn-link rt-plus-sign";
    if (!table.props.disableAddColumn && table.props.cornerIcon) {
        corner = React.createElement("img", {src: table.props.cornerIcon});
        classString = "btn-link rt-corner-image";
    }

    // the plus sign at the end to add columns
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

function buildHeaderLabel(table, columnDef, isFirstColumn) {
    return isFirstColumn ? buildFirstColumnLabel(table) : (React.createElement("span", null, columnDef.text, " ", columnDef.isLoading ? React.createElement("i", {className: "fa fa-spinner fa-spin"}) : null));
}

function clickCheckbox(props, isSubtotalRow) {
    var checkboxCallback = props.table.props.checkboxCallback;
    if (isSubtotalRow) {
        props.data.treeNode.isChecked = !props.data.treeNode.isChecked;
        //check all children rows
        checkAllChildren(props.data.treeNode, props.data.treeNode.isChecked);
    } else {
        props.data.isChecked = !props.data.isChecked;
    }
    props.table.setState({});

    if (checkboxCallback) {
        var root = props.table.state.rootNode;
        var checkedRows = [];

        root.ultimateChildren.forEach(function (uchild) {
            if (uchild.isChecked) {
                var row = {};
                for (var key in uchild) {
                    if (key !== 'parent' && key !== 'isDetail' && key !== 'isChecked' && key !== 'sectorPath') {
                        row[key] = uchild[key];
                    }
                }
                checkedRows.push(row);
            }
        });
        checkboxCallback(checkedRows);
    }
}

/**
 * check or unchecked all rows under a treenode
 * @param treeNode
 * @param checked
 */
function checkAllChildren(treeNode, checked) {
    treeNode.ultimateChildren.forEach(function (uchild) {
        uchild.isChecked = checked;
    });
    treeNode.children.forEach(function (child) {
        child.isChecked = checked;
        checkAllChildren(child, checked);
    });
}

/**
 * create the first cell for each row, append the proper ident level based on the cell's depth in the subtotaling tree
 * @returns {*}
 */
function buildFirstCellForSubtotalRow(isGrandTotal, isSubtotalRow) {
    var props = this.props;
    var data = props.data, columnDef = props.columnDefs[0], toggleHide = props.toggleHide;
    var firstColTag = columnDef.colTag, userDefinedElement, result;
    var hasCheckbox = props.table.props.hasCheckbox;
    // styling & ident
    var identLevel = !data.isDetail ? data.sectorPath.length - 1 : data.sectorPath.length;
    var firstCellStyle = {
        "paddingLeft": (10 + identLevel * 25) + "px"
    };

    userDefinedElement = (!data.isDetail && columnDef.summaryTemplate) ? columnDef.summaryTemplate.call(null, data) : null;

    if (isGrandTotal) {
        if (data[firstColTag]) {
            firstCellStyle.width = data[firstColTag].length + "em";
        }
        result = (
            React.createElement("div", {key: firstColTag, className: "rt-grand-total-cell"}, 
                React.createElement("div", {style: firstCellStyle, className: "rt-grand-total-cell-content"}, 
                        data[firstColTag] ? data[firstColTag] : React.createElement("span", null, " ")
                )
            )
        );
    } else if (isSubtotalRow) {
        var noCollapseIcon = data.treeNode.noCollapseIcon;

        result = (
            React.createElement("td", {key: firstColTag}, 
                React.createElement("div", null, 
                 hasCheckbox ? React.createElement("span", {style: {'paddingLeft': '10px'}}, 
                    React.createElement("input", {checked: props.data.treeNode.isChecked, type: "checkbox", onClick: clickCheckbox.bind(null, props, true)})
                ) : '', 
                    React.createElement("a", {style: firstCellStyle, onClick: toggleHide.bind(null, data), className: "btn-link rt-expansion-link"}, 
                         noCollapseIcon ? '' : data.treeNode.collapsed ? React.createElement("i", {className: "fa fa-plus"}) : React.createElement("i", {className: "fa fa-minus"})
                    ), 
                "  ", 
                    React.createElement("strong", null, data[firstColTag]), 
                    userDefinedElement
                )
            )
        );
    } else if (!isSubtotalRow) {
        result = (
            React.createElement("td", {key: firstColTag}, 
                 hasCheckbox ? React.createElement("span", {style: {'paddingLeft': '10px'}}, 
                    React.createElement("input", {checked: props.data.isChecked, type: "checkbox", onClick: clickCheckbox.bind(null, props, false)})
                ) : ''
            )
        );
        return result;
    }

    return result;
}

function buildPageNavigator(table, paginationAttr) {
    return table.props.columnDefs.length > 0 && !table.props.disablePagination ?
        (React.createElement(PageNavigator, {
            items: paginationAttr.allPages.slice(paginationAttr.pageDisplayRange.start, paginationAttr.pageDisplayRange.end), 
            activeItem: table.state.currentPage, 
            numPages: paginationAttr.pageEnd, 
            handleClick: table.handlePageClick})) : null;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function buildFooter(paginationAttr, rowNum) {
    var start = paginationAttr.lowerVisualBound + 1;
    var end = Math.min(paginationAttr.upperVisualBound + 1, rowNum);

    return (
        React.createElement("div", null, 
            React.createElement("p", {className: "rt-display-inline rt-footer-count"}, 
                "Showing " + start + " to " + end + " rows out of " + numberWithCommas(rowNum) + " rows"
            ), 
            this.props.disableInfiniteScrolling ? buildPageNavigator(this, paginationAttr) : null
        )
    )
}

/**
 *  if has subtotal, add an additional column as the first column, otherwise remove subtotal column
 */
function addExtraColumnForSubtotalBy() {
    if (this.state.subtotalBy.length > 0 && this.state.columnDefs[0].colTag !== 'subtotalBy') {
        this.state.columnDefs.unshift({
            colTag: "subtotalBy",
            text: "group"
        });
        var sortSubtotalByColumn = this.state.sortBy.some(function (sortby) {
            return sortby.colTag === 'subtotalBy';
        });
        if (sortSubtotalByColumn) {
            this.state.rootNode.sortTreeBySubtotals(this.state.subtotalBy, 'asc');
        }
    } else if (this.state.subtotalBy.length == 0 && this.state.columnDefs[0].colTag === 'subtotalBy') {
        this.state.columnDefs.shift();
    }
};//Contants used for date subtotalling
const WEEKLY = "Weekly";
const MONTHLY = "Monthly";
const QUARTERLY = "Quarterly";
const YEARLY = "Yearly";
const DAILY = "Daily";
const DATE_FORMAT = "date";
const OLDEST = "Oldest";

/**
 * find the right sector name for the current row for the given level of row grouping
 * this method can take partition subtotalBy columns that are numeric in nature and partition rows based on where they fall
 * in the partition
 * @param subtotalBy the column to group subtotalBy
 * @param row the data row to determine the sector name for
 * @param partitions the criteria for creating partitions for date columns
 */
function classifyRow(row, subtotalBy, partitions) {
    var sectorName = "", sortIndex = null;
    if (subtotalBy.format == "number" || subtotalBy.format == "currency" || (subtotalBy.format == "date" && subtotalBy.formatInstructions != null)) {
        var result = resolvePartitionName(subtotalBy, row, partitions);
        sectorName = result.sectorName;
        sortIndex = result.sortIndex;
    } else
        sectorName = row[subtotalBy.colTag];
    return {sectorName: sectorName || "Other", sortIndex: sortIndex};
}

function aggregateSector(partitionResult, columnDefs, subtotalBy) {
    var result = {};
    for (var i = 0; i < columnDefs.length; i++)
        result[columnDefs[i].colTag] = aggregateColumn(partitionResult, columnDefs[i], subtotalBy, columnDefs);
    return result;
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function resolvePartitionName(subtotalBy, row, partitions) {
    var sectorName = "", sortIndex = "";

    if (subtotalBy.subtotalByRange) {
        if (row[subtotalBy.colTag] != null) {
            for (var i = 0; i < subtotalBy.subtotalByRange.length; i++) {
                if (row[subtotalBy.colTag] < subtotalBy.subtotalByRange[i]) {
                    if (subtotalBy.format == DATE_FORMAT && subtotalBy.formatInstructions != null) {
                        var dateStr1 = moment(subtotalBy.subtotalByRange[i - 1]).format(subtotalBy.formatInstructions);
                        var dateStr2 = moment(subtotalBy.subtotalByRange[i]).add(-1, "days").format(subtotalBy.formatInstructions);
                        if (partitions == YEARLY) {
                            //dateStr1 = new Date(row[subtotalBy.colTag]).getFullYear();
                            //sectorName = subtotalBy.text + " " + dateStr1;
                            sectorName = new Date(row[subtotalBy.colTag]).getFullYear();
                        }
                        else if (partitions == DAILY) {
                            sectorName = dateStr1;
                        }
                        else if (partitions == MONTHLY) {
                            sectorName = moment(subtotalBy.subtotalByRange[i - 1]).format("MMM YYYY");
                        }
                        else {
                            sectorName = dateStr1 + " - " + dateStr2;
                        }
                    }
                    else {
                        sectorName = (i != 0 ? subtotalBy.subtotalByRange[i - 1] : 0) + " - " + subtotalBy.subtotalByRange[i];
                    }
                    sortIndex = i;
                    break;
                }
            }
            if (!sectorName) {
                if (subtotalBy.format == DATE_FORMAT && subtotalBy.formatInstructions != null) {
                    var date = new Date(subtotalBy.subtotalByRange[subtotalBy.subtotalByRange.length - 1]);
                    var dateStr = moment(date).format(subtotalBy.formatInstructions);
                    if (partitions == YEARLY) {
                        dateStr = new Date(dateStr).getFullYear();
                    }
                    else if (partitions == MONTHLY) {
                        dateStr = moment(date).format("MMM YYYY");
                    }
                    else if (partitions == DAILY) {
                        dateStr = moment(date).format("YYYY/MM/DD");
                    }
                    sectorName = dateStr + "+";
                }
                else {
                    sectorName = subtotalBy.subtotalByRange[subtotalBy.subtotalByRange.length - 1] + "+";
                }
                sortIndex = i + 1;
            }
        }
    }
    else {
        if (subtotalBy.format == DATE_FORMAT && subtotalBy.formatInstructions != null) {
            sectorName = moment(row[subtotalBy.colTag]).format(subtotalBy.formatInstructions);
        } else {
            sectorName = row[subtotalBy.colTag];
        }
        if (subtotalBy.format == DATE_FORMAT && subtotalBy.format == "number") {
            sortIndex = row[subtotalBy.colTag];
        }
    }
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
    var result;
    if (typeof columnDef.aggregationFunction === 'function')
        result = columnDef.aggregationFunction;
    else if (typeof columnDef.aggregationMethod === 'string')
        result = columnDef.aggregationMethod.toLowerCase();
    // resolve conditional aggregation method
    else if (columnDef.conditionalAggregationMethod && subtotalBy && subtotalBy.length == 1) {
        var subtotalByColTag = subtotalBy[0].colTag;
        if (columnDef.conditionalAggregationMethod[subtotalByColTag])
            result = columnDef.conditionalAggregationMethod[subtotalByColTag].toLowerCase();
    }
    return result;
}

function removeFilteredRow(rows) {
    var ret = [];
    rows.forEach(function (row) {
        if (!row.hiddenByFilter) {
            ret.push(row);
        }
    });
    return ret;
}

function aggregateColumn(partitionResult, columnDef, subtotalBy, columnDefs) {
    var result;
    var aggregationMethod = resolveAggregationMethod(columnDef, subtotalBy);

    partitionResult = removeFilteredRow(partitionResult);
    // call custom aggregation function or use one of the stock aggregation functions
    if (typeof aggregationMethod === 'function')
        result = aggregationMethod({data: partitionResult, columnDef: columnDef});
    else
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
            case "weighted_average":
                result = _weightedAverage({data: partitionResult, columnDef: columnDef});
                break;
            case "non_zero_weighted_average":
                result = _nonZeroweightedAverage({data: partitionResult, columnDef: columnDef});
                break;
            case "distinct_sum":
                result = _distinctSum({data: partitionResult, columnDef: columnDef});
                break;
            case "percentage_contribution":
                result = _percentageContribution({data: partitionResult, columnDef: columnDef, columnDefs: columnDefs});
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

function _nonZeroweightedAverage(options) {
    var data = options.data, columnDef = options.columnDef, weightBy = options.columnDef.weightBy;
    var sumProduct = 0;
    var zeroWeightSum = 0;
    for (var i = 0; i < data.length; i++) {
        sumProduct += (data[i][columnDef.colTag] || 0 ) * (data[i][weightBy.colTag] || 0);
        //find the zero values
        if (!data[i][columnDef.colTag] || data[i][columnDef.colTag] === 0) {
            zeroWeightSum += (data[i][weightBy.colTag] || 0);
        }
    }
    var weightSum = _straightSumAggregation({data: data, columnDef: weightBy});
    weightSum -= zeroWeightSum;

    return weightSum == 0 ? "" : sumProduct / weightSum;
}

function _weightedAverage(options) {
    var data = options.data, columnDef = options.columnDef, weightBy = options.columnDef.weightBy;
    var sumProduct = 0;
    for (var i = 0; i < data.length; i++)
        sumProduct += (data[i][columnDef.colTag] || 0 ) * (data[i][weightBy.colTag] || 0);

    var weightSum = _straightSumAggregation({data: data, columnDef: weightBy});
    return weightSum == 0 ? "" : sumProduct / weightSum;
}

function _distinctSum(options) {
    var data = options.data;
    var columnDef = options.columnDef;
    var aggregationLevel = columnDef.aggregationLevel;
    var result = 0, temp = 0;
    var distinctValues = {};
    for (var i = 0; i < data.length; i++) {
        var levelValue = data[i][aggregationLevel.colTag];
        distinctValues[levelValue] = data[i][columnDef.colTag];
    }
    for (var level in distinctValues) {
        temp = distinctValues[level] || 0;
        result += temp;
    }
    return result;
}

function _percentageContribution(options) {
    var data = options.data;
    var columnDef = options.columnDef;
    var numerator = columnDef.numerator;
    var denominator = columnDef.denominator;
    if (!denominator || !denominator.colTag || !numerator || !numerator.colTag) {
        //don't define columns
        return ""
    }

    var numeratorValue = _straightSumAggregation({data: data, columnDef: numerator}) || 0;

    var denominatorColumn = null;
    options.columnDefs.forEach(function (column) {
        if (column.colTag == denominator.colTag) {
            denominatorColumn = column;
        }
    });

    if (!denominatorColumn) {
        var denominatorValue = 0;
    } else {
        denominatorValue = _distinctSum({data: data, columnDef: denominatorColumn});
    }

    return denominatorValue == 0 ? "" : ((numeratorValue / denominatorValue) * 100);
}

function _count(options) {
    return (options.data.length || 0) + "";
}

/**
 * count the distinct values in an array of column values
 * @param options
 * @return {*}
 * @private
 */
function _countDistinct(options) {
    var data = options.data, columnDef = options.columnDef;

    if (data.length == 0)
        return 0;

    /**
     * collect all rows of the given column in data as an array
     */
    var allData =
        options.data.map(function (row) {
            return row[columnDef.colTag];
        });

    //convert date number to date string
    if (columnDef.format && columnDef.format.toLowerCase() === DATE_FORMAT) {
        allData = allData.map(function (item) {
            return convertDateNumberToString(columnDef, item);
        })
    }

    /**
     * iterate through allData - keeping only unique members
     */
    const uniqData = [];
    for (var j = 0; j < allData.length; j++) {
        if (allData[j] !== "" && allData[j] !== null && uniqData.indexOf(allData[j]) == -1)
            uniqData.push(allData[j]);
    }

    return uniqData.length == 1 ? uniqData[0] : applyThousandSeparator(uniqData.length);
}

function _countAndDistinctPureJS(options) {
    var data = options.data, columnDef = options.columnDef;
    var count = _count(options);
    var distinctCount = _countDistinct(options);
    return count == 1 ? formatNumber(distinctCount, columnDef, columnDef.formatConfig) : "(" + applyThousandSeparator(distinctCount) + "/" + applyThousandSeparator(count) + ")"
}

// convert and format dates
function convertDateNumberToString(columnDef, value) {
    var displayContent = value;
    if (columnDef && columnDef.format && columnDef.format.toLowerCase() === DATE_FORMAT) {
        // if displayContent is a number, we assume displayContent is in milliseconds
        if (typeof value === "number") {
            if (columnDef.formatInstructions != null) { //If format instruction is specified
                displayContent = moment(value).format(columnDef.formatInstructions)
            } else {
                displayContent = new Date(value).toLocaleDateString();
            }
        }
    }
    return displayContent;
}

function _countAndDistinctUnderscoreJS(options) {
    var data = options.data, columnDef = options.columnDef;
    var sortedData = _.pluck(data, columnDef.colTag).sort(function (a, b) {
        if (a === b)
            return 0;
        return a > b ? 1 : -1;
    });

    //convert date number to date string
    if (columnDef.format && columnDef.format.toLowerCase() === DATE_FORMAT) {
        sortedData = sortedData.map(function (item) {
            return convertDateNumberToString(columnDef, item);
        })
    }

    const uniqData = _.chain(sortedData).uniq(true).compact().value();
    columnDef.formatConfig = buildLAFConfigObject(columnDef);
    return "(" + (uniqData.length === 1 ? formatNumber(uniqData[0], columnDef, columnDef.formatConfig) : applyThousandSeparator(uniqData.length)) + "/" + applyThousandSeparator(data.length) + ")";
}

/**
 * if underscorejs is included, we will use a much more efficient algo to aggregate and count
 * otherwise a pure javascript approach is used but is slow for large number of rows
 * @param options
 * @return {*}
 * @private
 */
function _countAndDistinct(options) {
    if (typeof _ === 'function')
        return _countAndDistinctUnderscoreJS(options);
    else
        return _countAndDistinctPureJS(options);
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
        onMenuClick: React.PropTypes.func,
        table : React.PropTypes.object

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
        var width = $(this.props.table.getDOMNode()).width();
        var position = $(this.getDOMNode()).parent().position();
        this.state.subMenu = this.props.subMenu;

        if (width - position.left < 200) {
            delete this.state.subMenu.props.style.left;
            this.state.subMenu.props.style.right = '100%';
        } else {
            delete this.state.subMenu.props.style.right;
            this.state.subMenu.props.style.left = '100%';
        }

        this.setState({showSubMenu: true});
    },
    hideSubMenu: function () {
        this.setState({showSubMenu: false});
    },
    render: function () {
        const subMenu = this.state.showSubMenu ?
            this.state.subMenu : null;

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
        cellRightClickMenu: React.PropTypes.object,
        /**
         * callbacks that the table accept
         */
        afterColumnRemove: React.PropTypes.func,
        beforeColumnAdd: React.PropTypes.func,
        onSelectCallback: React.PropTypes.func, // if a detail row is clicked with ctrl key pressed
        onSummarySelectCallback: React.PropTypes.func,
        onRowClickCallback: React.PropTypes.func, // if a detail row is clicked
        onSummaryRowClickCallback: React.PropTypes.func,
        onRightClick: React.PropTypes.func,
        afterFilterCallback: React.PropTypes.func,
        buildFiltersCallback: React.PropTypes.func,
        checkboxCallback: React.PropTypes.func, // when click checkbox, invoke this callback
        /**
         * props to selectively disable table features
         */
        disableAddColumn: React.PropTypes.bool,
        disablePagination: React.PropTypes.bool,
        disableInfiniteScrolling: React.PropTypes.bool,
        disableExporting: React.PropTypes.bool,
        disableGrandTotal: React.PropTypes.bool,
        enableScrollPage: React.PropTypes.bool,
        hideSubtotaledColumns: React.PropTypes.bool,
        hideSingleSubtotalChild: React.PropTypes.bool,
        hasCheckbox: React.PropTypes.bool, // has a check box in subtotal column
        disableRemoveColumn: React.PropTypes.bool, // disable 'remove column' in subMenu
        disableDownloadPDF: React.PropTypes.bool, // disable 'Download PDF' in subMenu
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
        if (sortBy.length > 0) {
            sortBy.length = 0;
        }
        sortBy.push({colTag: columnDef.colTag, sortType: sortType});
        var newState = {
            sortBy: sortBy
        };

        if (columnDef.colTag === 'subtotalBy') {
            this.state.rootNode.sortTreeBySubtotals(this.state.subtotalBy, sortType);
        } else {
            this.state.rootNode.sortNodes(convertSortByToFuncs(this.state.columnDefs, sortBy));
        }
        newState.rootNode = this.state.rootNode;
        newState.buildRasterizedData = true;
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
        newState.buildRasterizedData = true;

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
        sortBy.length = 0;
        newState.sortBy = sortBy;
        newState.rootNode = createNewRootNode(this.props, this.state);
        newState.buildRasterizedData = true;
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
            upperVisualBound: this.props.pageSize,
            buildRasterizedData: true
        });
    },
    handleExpandAll: function () {
        this.state.rootNode.expandRecursively();
        this.setState({
            currentPage: 1,
            lowerVisualBound: 0,
            upperVisualBound: this.props.pageSize,
            buildRasterizedData: true
        });
    },
    handleDownload: function (type) {
        var reactTableData = this;

        var objToExport = {headers: [], data: []};

        var firstColumn = this.state.columnDefs[0];

        var rasterizedData = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: firstColumn
        });

        var firstColumnLabel = buildFirstColumnLabel(this);
        $.each(this.props.columnDefs, function () {
            if (this.colTag === 'subtotalBy') {
                objToExport.headers.push(firstColumnLabel);
            } else {
                objToExport.headers.push(this.text);
            }
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
            selectedDetailRows[key] = true;
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
        this.setState({buildRasterizedData: true});
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
            columnDefs.push(columnDef);
        /**
         * we will want to perform an aggregation
         */
        recursivelyAggregateNodes(this.state.rootNode, this.state);
        this.setState({
            columnDefs: columnDefs,
            buildRasterizedData: true
        });
    },
    handleScroll: function (e) {
        const $target = $(e.target);
        const scrollTop = $target.scrollTop();

        if (scrollTop == this.state.lastScrollTop) {
            // scroll horizentally
            return;
        }

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
        //TODO: should listen on onWheel and give some conditions
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
            //when scroll table body horizontally, scroll header and footer also
            $node.find(".rt-headers").css({'overflow': 'auto'}).scrollLeft($(this).scrollLeft());
            $node.find(".rt-headers").css({'overflow': 'hidden'});

            $node.find(".rt-grand-total").css({'overflow': 'auto'}).scrollLeft($(this).scrollLeft());
            $node.find(".rt-grand-total").css({'overflow': 'hidden'});
        });
        bindHeadersToMenu($node);

        // build dropdown list for column filter
        buildFilterData.call(this, false);
    },
    componentWillMount: function () {
    },
    componentWillUnmount: function () {
        window.removeEventListener('resize', adjustHeaders.bind(this));
        if (this.props.disableInfiniteScrolling)
            $(this.getDOMNode()).find(".rt-scrollable").get(0).removeEventListener('scroll', this.handleScroll);
    },
    componentDidUpdate: function () {
        if (this.state.scrollToLeft) {
            this.state.scrollToLeft = false;
            $(this.refs.scrollBody.getDOMNode()).scrollLeft(0);
        }
        //console.time('adjust headers');
        adjustHeaders.call(this);
        //console.timeEnd('adjust headers');
        bindHeadersToMenu($(this.getDOMNode()));
    },

    /*******public API, called outside react table*/
    addFilter: function (columnDefToFilterBy, filterData) {
        this.handleColumnFilter.call(this, columnDefToFilterBy, filterData);
    },
    removeFilter: function ReactTableHandleRemoveFilter(colDef, dontSet) {
        this.handleClearFilter.call(this, colDef, dontSet);
    },
    removeAllFilter: function () {
        this.handleClearAllFilters.call(this);
    },
    exportDataWithSubtotaling: function () {
        var dataCopy = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: this.state.columnDefs[0]
        }, this.state.subtotalBy.length > 0, true);

        var data = [];
        for (var i = 0; i < dataCopy.length; i++) {
            //shallow copy each row
            var row = dataCopy[i];
            if (row.treeNode) {
                delete row.treeNode
            }
            if (row.parent) {
                delete row.parent;
            }
        }
        return dataCopy;
    },
    recreateTable: function(){
        this.state.rootNode = createNewRootNode(this.props, this.state);
    },
    exportDataWithoutSubtotaling: function () {
        var dataCopy = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: this.state.columnDefs[0]
        }, this.state.subtotalBy.length > 0, true, true);

        var data = [];
        for (var i = 0; i < dataCopy.length; i++) {
            //shallow copy each row
            var row = $.extend({}, dataCopy[i]);
            if (row.treeNode) {
                delete row.treeNode
            }
            if (row.parent) {
                delete row.parent;
            }
            data.push(row)
        }
        return data;
    },
    refresh: function () {
        this.setState({buildRasterizedData: true});
    },
    getSubtotals: function () {
        return this.state.subtotalBy;
    },
    getSorts: function () {
        return this.state.sortBy;
    },
    checkAllRows: function (checked) {
        checkAllChildren(this.state.rootNode, checked);
        this.setState({});
    },
    refreshSubtotalRow: function () {
        recursivelyAggregateNodes(this.state.rootNode, this.state);
        this.setState({buildRasterizedData: true});
    },
    render: function () {
        //console.time('fresh: ');

        if (!this.state.rasterizedData || this.state.buildRasterizedData) {
            rasterizeTreeForRender.call(this);
        }

        const rasterizedData = this.state.rasterizedData;
        // TODO merge lower&upper visual bound into state, refactor getPaginationAttr
        var paginationAttr = getPaginationAttr(this, rasterizedData);
        var grandTotal = this.state.grandTotal;

        var rowsToDisplay = [];
        if (this.props.disableInfiniteScrolling)
            rowsToDisplay = rasterizedData.slice(paginationAttr.lowerVisualBound, paginationAttr.upperVisualBound + 1).map(rowMapper, this);
        else
            rowsToDisplay = rasterizedData.slice(this.state.lowerVisualBound, this.state.upperVisualBound + 1).map(rowMapper, this);

        var headers = buildHeaders(this);
        this.state.rowNumToDisplay = rowsToDisplay.length;

        var tableBodyContainerStyle = {};
        if (this.props.height && parseInt(this.props.height) > 0) {
            tableBodyContainerStyle.height = this.props.height;
        }

        if (this.props.disableScrolling)
            tableBodyContainerStyle.overflowY = "hidden";

        //console.timeEnd('fresh: ');

        return (
            React.createElement("div", {id: this.state.uniqueId, className: "rt-table-container"}, 
                headers, 
                React.createElement("div", {ref: "scrollBody", style: tableBodyContainerStyle, className: "rt-scrollable", 
                    onWheel: this.props.enableScrollPage ? scrollPage.bind(this, paginationAttr) : null}, 
                    React.createElement("table", {ref: "tableBody", className: "rt-table"}, 
                        React.createElement("tbody", null, 
                        rowsToDisplay
                        )
                    )
                ), 
                this.props.disableGrandTotal === true ? null : grandTotal, 
                buildFooter.call(this, paginationAttr, rasterizedData.length)
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
        var cells = [];
        var table = this.props.table;
        var isGrandTotal = false;
        if (!this.props.data.isDetail && this.props.data.sectorPath.length == 1 && this.props.data.sectorPath[0] == 'Grand Total') {
            isGrandTotal = true;
        }

        for (var i = 0; i < this.props.columnDefs.length; i++) {
            var columnDef = this.props.columnDefs[i];

            if (table.props.hideSubtotaledColumns) {
                var subtotalled = table.state.subtotalBy.some(function (subtotalColumn) {
                    return subtotalColumn.colTag === columnDef.colTag;
                });
                if (subtotalled) {
                    continue;
                }
            }

            if (i === 0 && table.state.subtotalBy.length > 0) {
                // generate subtotal column
                cells.push(buildFirstCellForSubtotalRow.call(this, isGrandTotal, !this.props.data.isDetail));
            } else {
                var displayInstructions = buildCellLookAndFeel(columnDef, this.props.data);
                var classes = cx(displayInstructions.classes);
                // easter egg - if isLoading is set to true on columnDef - spinners will show up instead of blanks or content
                var displayContent = columnDef.isLoading ? "Loading ... " : displayInstructions.value;

                // convert and format dates
                if (columnDef && columnDef.format && columnDef.format.toLowerCase() === DATE_FORMAT) {
                    if (typeof displayContent === "number") // if displayContent is a number, we assume displayContent is in milliseconds
                        if (columnDef.formatInstructions != null) { //If format instruction is specified
                            displayContent = moment(displayContent).format(columnDef.formatInstructions)
                        } else {
                            displayContent = new Date(displayContent).toLocaleDateString();
                        }
                }
                // determine cell content, based on whether a cell templating callback was provided
                if (columnDef.cellTemplate)
                    displayContent = columnDef.cellTemplate.call(this, this.props.data, columnDef, displayContent);
                if (isGrandTotal) {
                    //generate cells in grand total row
                    var grandTotalCellStyle = {textAlign: displayInstructions.styles.textAlign};
                    if (displayContent) {

                        grandTotalCellStyle.width = displayContent.length / 2 + 2 + "em";
                    }
                    cells.push(
                        React.createElement("div", {className: classes + " rt-grand-total-cell", key: columnDef.colTag}, 
                            React.createElement("div", {className: "rt-grand-total-cell-content", style: grandTotalCellStyle}, 
                                displayContent ? displayContent : React.createElement("span", null, " ")
                            )
                        )
                    );
                }
                else {
                    cells.push(
                        React.createElement("td", {
                            className: classes, 
                            ref: columnDef.colTag, 
                            onClick: columnDef.onCellSelect ? columnDef.onCellSelect.bind(null, this.props.data[columnDef.colTag], columnDef, i) : null, 
                            onContextMenu: this.props.cellRightClickMenu ? openCellMenu.bind(this, columnDef) : this.props.onRightClick ? this.props.onRightClick.bind(null, this.props.data, columnDef) : null, 
                            style: displayInstructions.styles, 
                            key: columnDef.colTag, 
                            //if define doubleClickCallback, invoke this first, otherwise check doubleClickFilter
                            onDoubleClick: columnDef.onDoubleClick ? columnDef.onDoubleClick.bind(null, this.props.data[columnDef.colTag], columnDef, i, this.props.data) : this.props.filtering && this.props.filtering.doubleClickCell ?
                                this.props.handleColumnFilter(null, columnDef) : null}, 
                            displayContent, 
                            this.props.cellRightClickMenu && this.props.data.isDetail ? buildCellMenu(this.props.cellRightClickMenu, this.props.data, columnDef, this.props.columnDefs) : null
                        )
                    );
                }
            }
        }

        classes = cx({
            'selected': this.props.isSelected && this.props.data.isDetail,
            'summary-selected': this.props.isSelected && !this.props.data.isDetail,
            'group-background': !this.props.data.isDetail
        });

        if (isGrandTotal) {
            // add a dummy column to the last to fit the vertical scroll bar
            cells.push(
                React.createElement("span", {className: "rt-grand-total-cell"}
                ));

            return (React.createElement("div", {className: "rt-grand-total"}, 
                cells
            ))
        } else
        // apply extra CSS if specified
            return (React.createElement("tr", {onClick: this.props.onSelect.bind(null, this.props.data), onMouseDown: mouseDown.bind(this, this.props.data), 
                onMouseUp: mouseUp.bind(this, this.props.data), 
                className: classes, style: this.props.extraStyle}, cells));
    }
});

function mouseDown(row, event) {
    this.props.table.state.mouseDown = {row: row};
}

function mouseUp(mouseUpRow, event) {
    if (mouseUpRow !== this.props.table.state.mouseDown.row) {
        var mouseDownRow = this.props.table.state.mouseDown.row;
        this.props.table.state.mouseDown = null;
        var rowKey = this.props.table.props.rowKey;
        if (!rowKey || !mouseUpRow[rowKey])
            return;

        var parent = mouseUpRow.parent;
        var start = Math.min(mouseDownRow.indexInParent, mouseUpRow.indexInParent);
        var end = Math.max(mouseDownRow.indexInParent, mouseUpRow.indexInParent);
        this.props.table.state.selectedDetailRows = {};
        for (var i = start; i <= end; i++) {
            var row = parent.ultimateChildren[i];
            this.props.table.toggleSelectDetailRow(row[rowKey]);
        }

        this.props.table.setState({});
    }
}

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
    handleClick: function (event) {
        event.stopPropagation();
        var $node = $(this.getDOMNode());
        $node.children(".menu-item-input").children("input").focus();
    },
    render: function () {
        var table = this.props.table, columnDef = this.props.columnDef;
        var subMenuAttachment = null;
        if (columnDef.format == "number" || columnDef.format == "currency") {
            subMenuAttachment =
                React.createElement("div", {className: "menu-item-input", style: {"position": "absolute", "top": "-50%", "right": "100%"}}, 
                    React.createElement("label", {style: {"display": "block"}}, "Enter Bucket(s)"), 
                    React.createElement("input", {tabIndex: "1", onKeyPress: this.handleKeyPress, onChange: this.handleChange, 
                        placeholder: "ex: 1,10,15"}), 
                    React.createElement("a", {tabIndex: "2", style: {"display": "block"}, 
                        onClick: table.handleSubtotalBy.bind(null, columnDef, this.state.userInputBuckets), 
                        className: "btn-link"}, "Ok")
                )


        }

        if (columnDef.format == DATE_FORMAT && columnDef.formatInstructions != null) {
            subMenuAttachment =
                React.createElement("div", {className: "menu-item-input", style: {"position": "absolute", "top": "-50%", "right": "100%"}}, 
                    React.createElement("label", {style: {"display": "block"}}, "Enter Bucket(s)"), 
                    React.createElement("input", {tabIndex: "1", onKeyPress: this.handleKeyPress, onChange: this.handleChange, 
                        placeholder: "ex: 1/8/2013, 5/12/2014, 3/10/2015"}), 
                    React.createElement("a", {tabIndex: "2", style: {"display": "block"}, 
                        onClick: table.handleSubtotalBy.bind(null, columnDef, this.state.userInputBuckets), 
                        className: "btn-link"}, "Ok")
                )

        }

        return (
            React.createElement("div", {
                onClick: subMenuAttachment == null ? table.handleSubtotalBy.bind(null, columnDef, null) : this.handleClick, 
                style: {"position": "relative"}, className: "menu-item menu-item-hoverable"}, 
                React.createElement("div", null, 
                    React.createElement("span", null, 
                        React.createElement("i", {className: "fa fa-plus"}), 
                    " Add Subtotal")
                ), 
                subMenuAttachment
            )
        );
    }
});


//Subtotal logic for dates

var SubtotalControlForDates = React.createClass({
    displayName: "SubtotalControlForDates",
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
    handleClick: function (event) {
        event.stopPropagation();
        var $node = $(this.getDOMNode());
        $node.children(".menu-item-input").children("input").focus();
    },
    render: function () {
        var table = this.props.table, columnDef = this.props.columnDef;
        var subMenuAttachment = null;
        var freq = this.props.freq;
        if (freq == WEEKLY) {
            return React.createElement("div", {
                    onClick: subMenuAttachment == null ? table.handleSubtotalBy.bind(null, columnDef, WEEKLY) : this.handleClick,
                    style: {"position": "relative"}, className: "menu-item menu-item-hoverable"
                },
                React.createElement("div", null,
                    React.createElement("span", null,
                        WEEKLY)
                ),
                subMenuAttachment
            );
        }
        if (freq == MONTHLY) {
            return React.createElement("div", {
                    onClick: subMenuAttachment == null ? table.handleSubtotalBy.bind(null, columnDef, MONTHLY) : this.handleClick,
                    style: {"position": "relative"}, className: "menu-item menu-item-hoverable"
                },
                React.createElement("div", null,
                    React.createElement("span", null,
                        MONTHLY)
                ),
                subMenuAttachment
            );
        }

        if (freq == DAILY) {
            return React.createElement("div", {
                    onClick: subMenuAttachment == null ? table.handleSubtotalBy.bind(null, columnDef, DAILY) : this.handleClick,
                    style: {"position": "relative"}, className: "menu-item menu-item-hoverable"
                },
                React.createElement("div", null,
                    React.createElement("span", null,
                        DAILY)
                ),
                subMenuAttachment
            );
        }

        if (freq == QUARTERLY) {
            return React.createElement("div", {
                    onClick: subMenuAttachment == null ? table.handleSubtotalBy.bind(null, columnDef, QUARTERLY) : this.handleClick,
                    style: {"position": "relative"}, className: "menu-item menu-item-hoverable"
                },
                React.createElement("div", null,
                    React.createElement("span", null,
                        QUARTERLY)
                ),
                subMenuAttachment
            );
        }

        if (freq == YEARLY) {
            return React.createElement("div", {
                    onClick: subMenuAttachment == null ? table.handleSubtotalBy.bind(null, columnDef, YEARLY) : this.handleClick,
                    style: {"position": "relative"}, className: "menu-item menu-item-hoverable"
                },
                React.createElement("div", null,
                    React.createElement("span", null,
                        YEARLY)
                ),
                subMenuAttachment
            );
        }
    }
})

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
        handleColumnFilter: this.handleColumnFilter.bind, 
        cellRightClickMenu: this.props.cellRightClickMenu, 
        table: this}
    ));
}

function docClick(e) {
    //adjustHeaders.call(this);
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
    if (this.state.rowNumToDisplay == 0) {
        //if table has no data, don't change column width
        return;
    }

    var id = this.state.uniqueId;
    if (!(adjustCount >= 0))
        adjustCount = 0;
    var counter = 0;
    var headerElems = $("#" + id + " .rt-headers-container");
    var headerContainerWidth = $("#" + id + ' .rt-headers-grand-container').width();
    var padding = parseInt(headerElems.first().find(".rt-header-element").css("padding-left"));
    padding += parseInt(headerElems.first().find(".rt-header-element").css("padding-right"));

    var grandTotalFooter = $('#' + id + ' .rt-grand-total');
    grandTotalFooter.width(headerContainerWidth);
    var grandTotalFooterCells = grandTotalFooter.find('.rt-grand-total-cell');
    var grandTotalFooterCellContents = grandTotalFooter.find('.rt-grand-total-cell-content');
    var adjustedSomething = false;

    var table = this;
    headerElems.each(function () {
        var currentHeader = $(this);
        var headerTextWidthWithPadding = currentHeader.find(".rt-header-anchor-text").width() + padding;
        var footerCellContentWidth = $(grandTotalFooterCellContents[counter]).width() + 10; // 10 is padding
        headerTextWidthWithPadding = footerCellContentWidth > headerTextWidthWithPadding ? footerCellContentWidth : headerTextWidthWithPadding;

        if (currentHeader.width() > 0 && headerTextWidthWithPadding > currentHeader.width() + 1) {
            currentHeader.css("width", headerTextWidthWithPadding + "px");
            $("#" + id).find("tr:eq(0)").find("td:eq(" + counter + ")").css("min-width", (headerTextWidthWithPadding) + "px");
            if (counter != (grandTotalFooterCells.length - 1)) {
                $(grandTotalFooterCells[counter]).css("width", (headerTextWidthWithPadding) + "px");
            }
            adjustedSomething = true;
        }

        var width = $('#' + id + ' .rt-table tr:first td:eq(' + counter + ')').outerWidth() - 1;
        if (counter == 0 && parseInt(headerElems.first().css("border-right")) == 1) {
            width += 1;
        }
        if (width !== currentHeader.width()) {
            currentHeader.width(width);
            $(grandTotalFooterCells[counter]).width(width);
            adjustedSomething = true;
        }
        counter++;
    });

    if (!adjustedSomething) {
        grandTotalFooterCellContents.each(function (index, cell) {
            $(cell).css('width', 'inherit');
        });
        return;
    }

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
    if (row.isChecked) {
        return true;
    }
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
        result.pageSize = (table.props.pageSize || 50);
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

        if (result.lowerVisualBound > result.upperVisualBound) {
            // after filter, data length has reduced. if lowerVisualBound is larger than the upperVisualBound, go to first page
            table.state.currentPage = 1;
            result.lowerVisualBound = 0;
            result.upperVisualBound = Math.min(result.pageSize - 1, data.length);
        }
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

function buildFilterData(isUpdate) {
    setTimeout(function () {
        if (isUpdate) {
            this.state.filterDataCount = {};
            this.state.filterData = {};
        }
        for (var i = 0; i < this.props.data.length; i++) {
            buildFilterDataHelper(this.props.data[i], this.state, this.props);
        }
        convertFilterData(this.state.filterDataCount, this.state);
        if (isUpdate) {
            this.props.buildFiltersCallback && this.props.buildFiltersCallback(this.state.filterDataCount);
        }
    }.bind(this));
}

/**
 * generate distinct values for each column
 * @param row
 * @param state
 * @param props
 */
function buildFilterDataHelper(row, state, props) {
    if (row.hiddenByFilter == true) {
        return;
    }

    if (!state.filterDataCount) {
        state.filterDataCount = {};
    }

    var columnDefs = state.columnDefs;
    for (var i = 0; i < columnDefs.length; i++) {
        if (columnDefs[i].format == 'number' || columnDefs[i].colTag == props.rowKey) {
            continue;
        }

        var key = columnDefs[i].colTag;
        if (row[key]) {
            var hashmap = state.filterDataCount[key] || {};
            hashmap[row[key]] = typeof hashmap[row[key]] === 'undefined' ? 1 : hashmap[row[key]] + 1;
            state.filterDataCount[key] = hashmap;
        }
    }
}

/**
 * convert distinct values in map into an array
 * @param filterData
 */
function convertFilterData(filterDataCount, state) {
    state.filterData = {};
    for (var key in filterDataCount) {
        var map = filterDataCount[key];
        var arr = [];
        for (var value in map) {
            if (value != "") {
                arr.push(value);
            }
        }
        state.filterData[key] = arr;
    }
}

function openCellMenu(columnDef, event) {
    event.preventDefault();
    var $cell = $(this.refs[columnDef.colTag].getDOMNode());
    var cellPosition = $cell.position();
    var $menu = $cell.find('.rt-cell-menu');
    if (cellPosition.left !== 0) {
        $menu.css("left", cellPosition.left + "px");
    }
    if (cellPosition.right !== 0) {
        $menu.css("right", cellPosition.right + "px");
    }
    $menu.css('display', 'block');

    $cell.hover(null, function hoveroutCell() {
        $menu.css('display', 'none');
    });

    $menu.hover(null, function hoveroutMenu() {
        $menu.css('display', 'none');
    });
}

function buildCellMenu(cellMenu, rowData, currentColumnDef, columnDefs) {
    if (!rowData[currentColumnDef.colTag]) {
        return null;
    }

    var menuItems = [];
    var menuStyle = {};

    if (cellMenu.style && cellMenu.style.textAlign === 'right') {
        menuStyle.right = "0%";
    }
    else {
        menuStyle.left = "0%";
    }

    if (currentColumnDef.rightClickMenuItems) {
        currentColumnDef.rightClickMenuItems.menus.forEach(function (menu) {
            menuItems.push(React.createElement("div", {className: "menu-item", onClick: menu.callback.bind(null, rowData, currentColumnDef, columnDefs)}, menu.description));
            if (menu.followingSeparator) {
                menuItems.push(React.createElement("div", {className: "separator"}));
            }
        });
    }
    else {
        cellMenu.menus.forEach(function (menu) {
            menuItems.push(React.createElement("div", {className: "menu-item", onClick: menu.callback.bind(null, rowData, currentColumnDef, columnDefs)}, menu.description));
            if (menu.followingSeparator) {
                menuItems.push(React.createElement("div", {className: "separator"}));
            }
        });
    }


    return (
        React.createElement("div", {style: menuStyle, className: "rt-cell-menu"}, 
            menuItems
        )
    )
}

/**
 * in pagination mode, scroll wheel to change page.
 * @param paginationAttr
 * @param event
 */
function scrollPage(paginationAttr, event) {
    event.stopPropagation();
    var $scrollBody = $(this.refs.scrollBody.getDOMNode());
    var $tableBody = $(this.refs.tableBody.getDOMNode());
    var scrollTop = $scrollBody.scrollTop();
    var scrollBodyheight = $scrollBody.height();
    var tableHeight = $tableBody.height();
    var scrollDown = event.deltaY > 0;

    if (scrollTop + scrollBodyheight >= tableHeight && scrollDown || scrollTop === 0 && !scrollDown) {
        // when scroll to bottom or top of table, prevent scroll whole document.
        // when at the first page and scroll up, or at the last page and srocll down, scroll the whole document
        if (!((this.state.currentPage == 1 && !scrollDown) || (this.state.currentPage == paginationAttr.pageEnd && scrollDown))) {
            event.preventDefault();
        }
    }

    if (scrollTop + scrollBodyheight >= tableHeight && this.state.lastScrollTop === scrollTop && scrollDown) {
        var nextPage = this.state.currentPage + 1;
    } else if (scrollTop === 0 && this.state.lastScrollTop === 0 && !scrollDown) {
        nextPage = this.state.currentPage - 1;
    }

    if (nextPage > 0 && nextPage <= paginationAttr.pageEnd) {
        this.setState({
            currentPage: nextPage,
            lastScrollTop: scrollTop
        });
        setTimeout(function () {
            if (scrollDown) {
                $scrollBody.scrollTop(0);
            }
            else {
                $scrollBody.scrollTop(tableHeight - scrollBodyheight);
            }
        });
    } else {
        this.state.lastScrollTop = scrollTop;
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
        currentFilters: [], // TODO same as above
        searchInPlace: {}, // use a search box to filter a column

        rasterizedData: null, // table data for render
        buildRasterizedData: true, // when change table structure such as sort or subtotal, set this to true.
        hideSingleSubtotalChild: this.props.hideSingleSubtotalChild // if a subtotal level only has one child, hide the child
    };

    /**
     * justifiable as a state because its children contain sub-states like collapse/expanded or hide/un-hide
     * these states/sub-states arise from user interaction with this component, and not derivable from props or other states
     */
    initialState.rootNode = getRootNodeGivenProps(this.props, initialState);

    if (initialState.sortBy.length > 0)
        initialState.rootNode.sortNodes(convertSortByToFuncs(initialState.columnDefs, initialState.sortBy));

    addSubtotalTitleToRowData(initialState.rootNode);

    if (initialState.sortBy.length > 0) {
        var sortSubtotalByColumn = null;
        initialState.sortBy.forEach(function (sortSetting) {
            if (sortSetting.colTag === 'subtotalBy') {
                sortSubtotalByColumn = sortSetting;
            }
            ;
        });
        if (sortSubtotalByColumn) {
            initialState.sortBy.length = 0;
            initialState.sortBy.push(sortSubtotalByColumn);
            initialState.rootNode.sortTreeBySubtotals(initialState.subtotalBy, sortSubtotalByColumn.sortType);
        } else {
            initialState.rootNode.sortNodes(convertSortByToFuncs(initialState.columnDefs, initialState.sortBy));
        }
    }

    var selections = getInitialSelections(this.props.selectedRows, this.props.selectedSummaryRows);
    initialState.selectedDetailRows = selections.selectedDetailRows;
    initialState.selectedSummaryRows = selections.selectedSummaryRows;

    return initialState;
}

function getRootNodeGivenProps(props, initialState) {
    if (props.dataAsTree && props.dataAsTreeTitleKey) {
        props.data = [];
        return createNewNodeFromStrucutre(props.dataAsTree, props.dataAsTreeTitleKey);
    }
    else {
        return createNewRootNode(props, initialState);
    }
}

/**
 * add subtotal title for a subtotal row.
 */
function addSubtotalTitleToRowData(root) {
    if (root == null) {
        return;
    }

    root.rowData['subtotalBy'] = root.sectorTitle;
    root.children.forEach(function (child) {
        addSubtotalTitleToRowData(child);
    });
}

/**
 * to select a row, need to press ctrl and mouse click. this won't confuse double click a cell
 * if don't press ctrl but do a mouse click, all selected rows will be unselected.
 * @param selectedRow
 * @param event
 * @constructor
 */
function ReactTableHandleSelect(selectedRow, event) {
    if (event.shiftKey) {
        //press shift key
        var rowKey = this.props.rowKey;
        if (!rowKey || !selectedRow[rowKey])
            return;

        event.stopPropagation();
        event.preventDefault();
        if (!this.state.shiftKey) {
            this.state.shiftKey = {firstRow: selectedRow};
        } else if (!this.state.shiftKey.firstRow) {
            this.state.shiftKey.firstRow = selectedRow;
        } else {
            //add first click row to current selected row
            var parent = selectedRow.parent;
            var start = Math.min(this.state.shiftKey.firstRow.indexInParent, selectedRow.indexInParent);
            var end = Math.max(this.state.shiftKey.firstRow.indexInParent, selectedRow.indexInParent);
            this.state.selectedDetailRows = {};
            for (var i = start; i <= end; i++) {
                var row = parent.ultimateChildren[i];
                this.toggleSelectDetailRow(row[rowKey]);
            }
        }
        return;
    }

    if (!event.ctrlKey) {
        //don't press ctrl, clean selected rows
        var clearSelected = false;
        if (Object.keys(this.state.selectedDetailRows).length > 0) {
            this.state.selectedDetailRows = {};
            clearSelected = true;
        }

        if (Object.keys(this.state.selectedSummaryRows).length > 0) {
            this.state.selectedSummaryRows = {};
            clearSelected = true;
        }

        if (!this.state.shiftKey || this.state.shiftKey.firstRow) {
            this.state.shiftKey = {firstRow: null};
        }

        if (selectedRow.isDetail != null && selectedRow.isDetail == true) {
            if (this.props.onRowClickCallback) {
                this.props.onRowClickCallback(selectedRow, false);
            }
        }
        else if (this.props.onSummaryRowClickCallback) {
            this.props.onSummaryRowClickCallback(selectedRow, false);
        }

        if (clearSelected) {
            this.setState({});
        }
    } else {
        var rowKey = this.props.rowKey;
        if (!rowKey || !selectedRow[rowKey])
            return;

        if (selectedRow.isDetail != null && selectedRow.isDetail == true) {
            var state = this.toggleSelectDetailRow(selectedRow[rowKey]);
            if (this.props.onSelectCallback) {
                this.props.onSelectCallback(selectedRow, state);
            }
        }
        else {
            state = this.toggleSelectSummaryRow(generateSectorKey(selectedRow.sectorPath));
            if (this.props.onSummarySelectCallback) {
                this.props.onSummarySelectCallback(selectedRow, state);
            }
        }
    }
}

function ReactTableHandleColumnFilter(columnDefToFilterBy, e, dontSet) {
    columnDefToFilterBy.isFiltered = true;

    if (typeof dontSet !== "boolean")
        dontSet = undefined;

    if (Array.isArray(e)) {
        var filterData = e;
    } else {
        var target = $(e.target);
        if (target.is("span")) {
            filterData = target.text();
        } else {
            filterData =  target.children('span').text();
        }
    }

    if (!Array.isArray(filterData)) {
        if (columnDefToFilterBy.format == 'number') {
            filterData = [{eq: filterData}];
        } else {
            filterData = [filterData];
        }
    }

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

    if (filterData.length != 0) {
        var customFilterer;
        if (this.props.filtering && this.props.filtering.customFilterer) {
            customFilterer = this.props.filtering.customFilterer;
        }
        this.state.rootNode.filterByColumn(columnDefToFilterBy, filterData, caseSensitive, customFilterer);
    }

    if (!dontSet) {
        buildFilterData.call(this, true);
        this.state.currentFilters.push({colDef: columnDefToFilterBy, filterText: filterData});
        this.setState({
            rootNode: this.state.rootNode,
            currentFilters: this.state.currentFilters,
            buildRasterizedData: true
        });
    }

    this.props.afterFilterCallback && this.props.afterFilterCallback(columnDefToFilterBy, filterData);
}

/**
 * reset all treeNode hiddenByFilter to false
 * @param lrootNode
 */
function resetHiddenForAllTreeNodes(lrootNode) {
    lrootNode.hiddenByFilter = false;
    for (var i = 0; i < lrootNode.children.length; i++) {
        resetHiddenForAllTreeNodes(lrootNode.children[i]);
    }
}

function ReactTableHandleRemoveFilter(colDef, dontSet) {
    if (typeof dontSet !== "boolean")
        dontSet = undefined;

    // First clear out all filters
    for (var i = 0; i < this.state.rootNode.ultimateChildren.length; i++) {
        this.state.rootNode.ultimateChildren[i].hiddenByFilter = false;
    }
    resetHiddenForAllTreeNodes(this.state.rootNode);

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
        buildFilterData.call(this, true);
        colDef.isFiltered = false;
        var fip = this.state.filterInPlace;
        delete fip[colDef.colTag];
        this.setState({
            filterInPlace: fip,
            rootNode: this.state.rootNode,
            currentFilters: this.state.currentFilters,
            buildRasterizedData: true
        });
    }

    this.props.afterFilterCallback && this.props.afterFilterCallback(colDef, []);
}

function ReactTableHandleRemoveAllFilters() {
    recursivelyClearFilters(this.state.rootNode);
    buildFilterData.call(this, true);
    //remove filter icon in header
    this.state.columnDefs.forEach(function (colDef) {
        colDef.isFiltered = false;
    });

    this.state.currentFilters.forEach(function (filter) {
        this.props.afterFilterCallback && this.props.afterFilterCallback(filter.colDef, []);
    }, this);

    // setState() does not immediately mutate this.state but creates a pending state transition.
    // Accessing this.state after calling this method can potentially return the existing value.
    // To avoid currentFilters haven't been changed when next time access it.
    this.state.currentFilters = [];
    this.setState({
        filterInPlace: {},
        rootNode: this.state.rootNode,
        buildRasterizedData: true
    });
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

    newState.buildRasterizedData = true;
    newState.currentPage = 1;
    newState.lowerVisualBound = 0;
    newState.upperVisualBound = this.props.pageSize;
    //newState.firstColumnLabel = buildFirstColumnLabel(this);
    /**
     * do not set subtotalBy or sortBy to blank array - simply pop all elements off, so it won't disrupt external reference
     */
    const subtotalBy = this.state.subtotalBy;
    while (subtotalBy.length > 0)
        subtotalBy.pop();
    newState.subtotalBy = subtotalBy;
    destorySubtrees(newState);
    //newState.rootNode = createNewRootNode(this.props, newState);
    /**
     * subtotaling destroys sort, so here we re-apply sort
     */
    if (this.state.sortBy.length > 0)
        newState.rootNode.sortNodes(convertSortByToFuncs(this.state.columnDefs, this.state.sortBy));

    applyAllFilters.call(this);
    this.setState(newState);
}

/**
 * check if a tree node needs to be hidden. if a tree node has no children to show, hide it.
 * @param lrootNode
 */
function hideTreeNodeWhenNoChildrenToShow(lrootNode) {
    if (lrootNode.hasChild()) {
        // Filter aggregations
        var allChildrenHidden = true;
        for (var i = 0; i < lrootNode.children.length; i++) {
            // Call recursively to filter leaf nodes first
            hideTreeNodeWhenNoChildrenToShow(lrootNode.children[i]);
            // Check to see if all children are hidden, then hide parent if so
            if (lrootNode.children[i].hiddenByFilter == false) {
                allChildrenHidden = false;
            }
        }
        lrootNode.hiddenByFilter = allChildrenHidden;
    } else {
        var hasAtLeastOneChildToShow = false;
        for (var j = 0; j < lrootNode.ultimateChildren.length; j++) {
            var uChild = lrootNode.ultimateChildren[j];
            if (uChild.hiddenByFilter == false) {
                hasAtLeastOneChildToShow = true;
                break;
            }
        }
        lrootNode.hiddenByFilter = !hasAtLeastOneChildToShow;
    }
};

function ReactTableHandleSubtotalBy(columnDef, partitions, event) {
    event.stopPropagation();
    const subtotalBy = this.state.subtotalBy || [];
    this.state.scrollToLeft = true;
    /**
     * determine if the subtotal operation require partitioning of the column values first
     */
    if (partitions != null && partitions != "" && columnDef) {

        if (columnDef.format == DATE_FORMAT && columnDef.formatInstructions != null) {
            var start = new Date('1/1/3002').getTime();
            var last = new Date('1/1/1002').getTime();
            var data = this.state.rootNode.ultimateChildren;
            for (var i = data.length - 1; i >= 0; i--) {
                tmp = data[i][columnDef.colTag];
                if (tmp < start) start = tmp;
                if (tmp > last) last = tmp;
            }

            if (partitions == WEEKLY || partitions == MONTHLY || partitions == DAILY || partitions == QUARTERLY || partitions == YEARLY) {
                columnDef.subtotalByRange = getParts(partitions, start, last);
            }
            else {     //Use partitions based on user input buckets
                var parts = [];
                var dates = partitions.split(",");
                for (i = 0; i < dates.length; i++) {
                    parts.push(new Date(dates[i]).getTime());
                }
                columnDef.subtotalByRange = parts;
            }
        }
        else {
            columnDef.subtotalByRange = partitionNumberLine(partitions);
        }

    }

    /**
     * make sure a valid column def is passed in
     */
    if (columnDef != null && columnDef.constructor.name != 'SyntheticMouseEvent')
        subtotalBy.push(columnDef);

    /**
     * extend the current state to derive new state after subtotal operation, then create a new rootNode
     */
    const newState = this.state;
    newState.currentPage = 1;
    newState.lowerVisualBound = 0;
    newState.upperVisualBound = this.props.pageSize;
    newState.subtotalBy = subtotalBy;
    newState.buildRasterizedData = true;
    buildSubtreeForNewSubtotal(newState, partitions);
    //newState.rootNode = createNewRootNode(this.props, newState);
    /**
     * subtotaling destroys sort, so here we re-apply sort
     */
    if (this.state.sortBy.length > 0)
        newState.rootNode.sortNodes(convertSortByToFuncs(this.state.columnDefs, this.state.sortBy));

    // subtotaling break filter also, because of create one more level of treeNode.
    // need hide treeNode which has no children to show
    if (this.state.currentFilters.length > 0) {
        hideTreeNodeWhenNoChildrenToShow(this.state.rootNode);
    }


    this.setState(newState);
}

//get parts for subtotalling of dates
function getParts(frequency, start, last) {
    var parts = [];
    var count = 1;
    var unit = "days";

    start = moment(start).startOf('day');
    if (frequency == MONTHLY) {
        unit = "months";
        count = 1;
        start = moment(start).startOf('month');
    } else if (frequency == QUARTERLY) {
        unit = "months";
        count = 3;
        start = moment(start).startOf('quarter');
    } else if (frequency == YEARLY) {
        unit = "years";
        count = 1;
        start = moment(start).startOf('year');
    } else if (frequency == WEEKLY) {
        unit = "days";
        count = 7;
        start = moment(start).startOf('isoWeek');
    }
    parts.push(start.unix() * 1000);

    while (start <= last) {
        start = moment(start).add(count, unit).unix() * 1000;
        parts.push(start);
    }
    return parts;
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
        columnDefs: newColumnDefs,
        buildRasterizedData: true
    });
    // TODO pass copies of these variables to avoid unintentional perpetual binding
    if (this.props.afterColumnRemove != null)
        this.props.afterColumnRemove(newColumnDefs, columnDefToRemove);
}

function ReactTableHandleToggleHide(summaryRow, event) {
    event.stopPropagation();
    summaryRow.treeNode.collapsed = !summaryRow.treeNode.collapsed;
    this.setState({buildRasterizedData: true});
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

function expandSubtotalLevelHelper(currentLevel, clickLevel, lTreeNode) {
    if (lTreeNode == null) {
        return;
    }
    if (currentLevel <= clickLevel) {
        lTreeNode.collapsed = false;
    } else {
        lTreeNode.collapsed = true;
    }
    for (var i = 0; i < lTreeNode.children.length; i++) {
        expandSubtotalLevelHelper(currentLevel + 1, clickLevel, lTreeNode.children[i]);
    }
}

/**
 * when click a subtotal level, expand this level
 * @param levelIndex
 * @param event
 */
function expandSubtotalLevel(levelIndex, event) {
    event.stopPropagation();
    expandSubtotalLevelHelper(0, levelIndex, this.state.rootNode);
    this.setState({buildRasterizedData: true});
}

/**
 * create subtotalBy information in header, e.g. [ tradeName -> tranType ]
 * @param table
 * @returns {string}
 */
function buildFirstColumnLabel(table) {
    if (table.state.subtotalBy.length > 0) {

        var subtotalHierarchy = [];
        table.state.subtotalBy.forEach(function (subtotalBy, index) {
            var column = table.state.columnDefs.filter(function (columnDef) {
                return columnDef.colTag === subtotalBy.colTag;
            });

            if (column.length == 0) {
                throw "subtotalBy field '" + subtotalBy.colTag + "' doesn't exist!";
            }

            var arrow = index == table.state.subtotalBy.length - 1 ? "" : " -> ";
            subtotalHierarchy.push(React.createElement("span", {className: "rt-header-clickable", onClick: expandSubtotalLevel.bind(table, index)}, " ", column[0].text, 
                React.createElement("span", {style: {color: 'white'}}, arrow)
            ));
        });

        return (
            React.createElement("span", null, " [ ", subtotalHierarchy, " ] ")
        )
    } else {
        return table.state.columnDefs[0].text;
    }
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
        var aDate = !a[this.colTag] ? 0 : a[this.colTag];
        var bDate = !b[this.colTag] ? 0 : b[this.colTag];

        return new Date(aDate) - new Date(bDate);
    },
    desc: function (a, b) {
        return -1 * dateSorter.asc.call(this, a, b);
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
function getSortFunction(columnDef, sortType, subtotalColumnDef) {
    const format = columnDef.format || "";
    var sorter = null;
    if (subtotalColumnDef) {
        sorter = lexicalSorter[sortType].bind(subtotalColumnDef);
        // if the user provided a custom sort function for the column, use that instead
        if (columnDef.sort && columnDef[sortType])
            sorter = columnDef.sort[sortType].bind(subtotalColumnDef);
        else if (format === "date")
            sorter = dateSorter[sortType].bind(subtotalColumnDef);
        return sorter;
    } else {
        sorter = lexicalSorter[sortType].bind(columnDef);
        // if the user provided a custom sort function for the column, use that instead
        if (columnDef.sort && columnDef[sortType])
            sorter = columnDef.sort[sortType].bind(columnDef);
        else if (format === "date")
            sorter = dateSorter[sortType].bind(columnDef);
        return sorter;
    }
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
 * @param state
 * @return {TreeNode}
 */
function createNewRootNode(props, state) {
    var rootNode = buildTreeSkeleton(props, state);
    recursivelyAggregateNodes(rootNode, state);

    rootNode.sortRecursivelyBySortIndex();
    rootNode.foldSubTree();

    if (state.currentFilters.length > 0 && state.subtotalBy.length > 0) {
        hideSubtotalRow(rootNode);
    }

    return rootNode;
}
/*
 this.sectorTitle = sectorTitle;
 this.parent = parent;
 this.subtotalByColumnDef = {};
 this.rowData = null;
 this.display = true;
 this.children = [];
 this.ultimateChildren = [];
 this.collapsed = true
 */
function createNewNodeFromStrucutre(treeData, titleKey, parent){
    var node = new TreeNode( parent ? treeData[titleKey] : "Grand Total", parent);
    _.each(treeData.children, function(child){
        if( child.children.length > 0 )
            node.children.push(createNewNodeFromStrucutre(child, titleKey, node));
        else
            node.ultimateChildren.push(createNewNodeFromStrucutre(child, titleKey, node));
    });
    if( node.ultimateChildren.length == 0 )
        node.isDetail = true;
    else
        setupChildrenMap(node);
    _.each(treeData, function(value, key){
        if( !_.isObject(value) ) {
            if( !node.rowData )
                node.rowData = {};
            if( node.ultimateChildren.length == 0 )
                node[key] = value;
            else
                node.rowData[key] = value;
        }
    });

    return node;
}

function setupChildrenMap(node){
    _.each(node.children, function(child){
        node.ultimateChildren = node.ultimateChildren.concat(child.ultimateChildren);
        node._childrenSectorNameMap[child.sectorTitle] = child;
    });
}

/**
 * hide subtotal rows which children has been hidden.
 * @param treeNode
 */
function hideSubtotalRow(treeNode) {
    if (treeNode.hasChild()) {
        // Filter aggregations
        var allChildrenHidden = true;
        for (var i = 0; i < treeNode.children.length; i++) {
            // Call recursively to filter leaf nodes first
            hideSubtotalRow(treeNode.children[i]);
            // Check to see if all children are hidden, then hide parent if so
            if (treeNode.children[i].hiddenByFilter == false) {
                allChildrenHidden = false;
            }
        }
        treeNode.hiddenByFilter = allChildrenHidden;
    } else {
        // filter ultimateChildren
        var showAtLeastOneChild = false;
        for (var j = 0; j < treeNode.ultimateChildren.length; j++) {
            var uChild = treeNode.ultimateChildren[j];
            showAtLeastOneChild = showAtLeastOneChild || !uChild.hiddenByFilter;
        }
        treeNode.hiddenByFilter = !showAtLeastOneChild;
    }
}

/**
 * adding new subtotalBy, only create the deepest level subtree
 * @param lrootNode
 * @param newSubtotal
 * @param state
 * @param partitions, partitions for subtotalling of date fields
 */
function buildSubtree(lrootNode, newSubtotal, state, partitions) {
    if (lrootNode.children.length == 0 || (lrootNode.children.children && lrootNode.children.children.length == 0)) {
        //find the leaf node
        for (var j = 0; j < lrootNode.ultimateChildren.length; j++) {
            //build subtree
            populateChildNodesForRow(lrootNode, lrootNode.ultimateChildren[j], newSubtotal, partitions);
        }
        for (var key in lrootNode._childrenSectorNameMap) {
            //generate subtree's aggregation info
            var node = lrootNode._childrenSectorNameMap[key];
            node.rowData = aggregateSector(node.ultimateChildren, state.columnDefs, newSubtotal);

        }
    } else {
        for (var i = 0; i < lrootNode.children.length; i++) {
            buildSubtree(lrootNode.children[i], newSubtotal, state, partitions);
        }
    }
}

/**
 * add a new subtotalBy, build subtrees in leaf nodes
 * @param state
 * @param partitions, partitions for subtotalling of date fields
 * @returns {*}
 */
function buildSubtreeForNewSubtotal(state, partitions) {
    var newSubtotal = [state.subtotalBy[state.subtotalBy.length - 1]];
    buildSubtree(state.rootNode, newSubtotal, state, partitions);
    state.rootNode.sortRecursivelyBySortIndex();
    state.rootNode.foldSubTree();

    return state.rootNode;
}

/**
 * destory all subtree in root
 * @param lroot
 */
function destorySubtreesRecursively(lroot) {
    if (lroot.children.length == 0) {
        return;
    }

    for (var i = 0; i < lroot.children.length; i++) {
        destorySubtreesRecursively(lroot.children[i]);
        lroot.children[i] = null;


    }
    lroot.children = [];
    lroot._childrenSectorNameMap = {};
}

/**
 * destory root's subtrees to clear subtotals
 * @param state
 */
function destorySubtrees(state) {
    destorySubtreesRecursively(state.rootNode);
    state.rootNode.ultimateChildren.forEach(function(child){
        child.hiddenByFilter = false;
    });
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
        rootNode.display = false;
    var subtotalByArr;
    if(state.subtotalBy != null) {
        subtotalByArr = [];
        for (i = 0; i < state.subtotalBy.length; i++) {
            var result = state.columnDefs.filter(function( colDef ) {
                return colDef.colTag == state.subtotalBy[i].colTag;
            });
            if(result[0] != null){
                subtotalByArr.push(result[0]);
            }
        }
    }
    for (i = 0; i < rawData.length; i++) {
        rootNode.appendUltimateChild(rawData[i]);
    }

    subtotalByArr.forEach(function (subtotalColumn) {
        //TODO: add partitions
        buildSubtree(rootNode, [subtotalColumn], state, null);
    });

    return rootNode
}

/**
 * Populate an existing skeleton (represented by the root node) with summary level data
 * @param node
 * @param state
 */
// can postpone generate lower level aggregation information to accelerate initial render
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

/**
 * Append the proper children TreeNode(s) to the `currentNode`
 * Children nodes are generated by running `subtotalBy` through
 * a sectoring process. The unique set of sector names resulting from this sectoring process
 * determines the children nodes for the `currentNode`
 *
 * @param currentNode {TreeNode}
 * @param ultimateChild {object}
 * @param subtotalBy
 * @param partitions, partitions for subtotalling of date fields
 */
function populateChildNodesForRow(currentNode, ultimateChild, subtotalBy, partitions) {
    var i;
    if (subtotalBy == null || subtotalBy.length == 0)
        return;
    for (i = 0; i < subtotalBy.length; i++) {
        const sectoringResult = classifyRow(ultimateChild, subtotalBy[i], partitions);
        currentNode.appendRowToChildren({
            childSectorName: sectoringResult.sectorName,
            childRow: ultimateChild,
            sortIndex: sectoringResult.sortIndex,
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
 * @returns the child TreeNode that the data was appended to
 * @param options
 */
TreeNode.prototype.appendRowToChildren = function (options) {
    var childSectorName = options.childSectorName,
        childRow = options.childRow,
        sortIndex = options.sortIndex,
        subtotalByColumnDef = options.subtotalByColumnDef;

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
 * recursively sort the
 * @param subtotalByArr
 * @param sortType
 * @param lrootNode
 * @param level
 * @param sortFuncs
 */
function sortTreeBySubtotalsHelper(subtotalByArr, sortType, lrootNode, level) {
    if (level >= subtotalByArr.length) {
        return;
    }
    var columnDef = subtotalByArr[level];
    var subtotalColumnDef = {colTag: 'subtotalBy', formatConfig: columnDef.formatConfig};
    var sortFunc = getSortFunction(columnDef, sortType, subtotalColumnDef);

    if (lrootNode.hasChild()) {
        lrootNode.children.sort(function (a, b) {
            return sortFunc(a.rowData, b.rowData);
        });

        lrootNode.children.forEach(function (child) {
            sortTreeBySubtotalsHelper(subtotalByArr, sortType, child, level + 1);
        });
    }
}

TreeNode.prototype.sortTreeBySubtotals = function (subtotalByArr, sortType) {
    sortTreeBySubtotalsHelper(subtotalByArr, sortType, this, 0);
};

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

function containsWildcart(filterArr) {
    var searchText = filterArr[0];
    if (filterArr.length == 1 && (searchText.indexOf('?')> -1 || searchText.indexOf('*')>-1)) {
        return true;
    }else{
        return false;
    }
}

/**
 *
 * @param filterArr
 * @param columnDef
 * @param row
 * @param caseSensitive
 * @returns {boolean} to indicate hide this row or not
 */
function filterInArray(filterArr, columnDef, row, caseSensitive) {

    if (columnDef.isSearchText || containsWildcart(filterArr)) {
        var searchText = filterArr[0];
        searchText = searchText.toLowerCase();
        searchText = searchText.replace(/\?/g, '.?');
        searchText = searchText.replace(/\*/g, '.*');
        var re = new RegExp('^' + searchText);
        var displayValue = buildCellLookAndFeel(columnDef, row).value.toString().toLowerCase();
        var found = displayValue.match(re);
        if (found) {
            return false;
        } else {
            return true;
        }
    } else {
        found = null;
        if (caseSensitive) {
            found = filterArr.some(function (filterText) {
                return buildCellLookAndFeel(columnDef, row).value.toString() === filterText;
            });
        } else {
            found = filterArr.some(function (filterText) {
                return buildCellLookAndFeel(columnDef, row).value.toString().toUpperCase() === filterText.toUpperCase();
            });
        }
        return !found;
    }
}

/**
 * filter data and recursively check if hidden parent tree node
 * @param columnDef
 * @param textToFilterBy
 * @param caseSensitive
 * @param customFilterer
 */
TreeNode.prototype.filterByTextColumn = function (columnDef, textToFilterBy, caseSensitive, customFilterer) {

    if (this.hasChild()) {
        // Filter aggregations
        var allChildrenHidden = true;
        for (var i = 0; i < this.children.length; i++) {
            // Call recursively to filter leaf nodes first
            this.children[i].filterByColumn(columnDef, textToFilterBy, caseSensitive, customFilterer);
            // Check to see if all children are hidden, then hide parent if so
            if (this.children[i].hiddenByFilter == false) {
                allChildrenHidden = false;
            }
        }
        this.hiddenByFilter = allChildrenHidden;
    } else {
        // filter ultimateChildren
        var showAtLeastOneChild = false;
        for (var i = 0; i < this.ultimateChildren.length; i++) {
            var uChild = this.ultimateChildren[i];
            if (customFilterer) {
                uChild.hiddenByFilter = !customFilterer(columnDef, uChild, textToFilterBy);
            }
            else {
                var row = {};
                row[columnDef.colTag] = uChild[columnDef.colTag];
                if (columnDef.format === 'date' && !columnDef.isSearchText) {
                    row[columnDef.colTag] = convertDateNumberToString(columnDef, row[columnDef.colTag]);
                    textToFilterBy = textToFilterBy.map(function (filter) {
                        var filterTmp = filter;
                        if (typeof filter === 'string') {
                            filterTmp = parseInt(filter);
                            if (filterTmp < 100000) {
                                filterTmp = filter;
                            }
                        }
                        return convertDateNumberToString(columnDef, filterTmp);
                    })
                }
                uChild.hiddenByFilter = typeof row[columnDef.colTag] === 'undefined' || uChild.hiddenByFilter || filterInArray(textToFilterBy, columnDef, row, caseSensitive);
            }
            showAtLeastOneChild = showAtLeastOneChild || !uChild.hiddenByFilter;
        }
        this.hiddenByFilter = !showAtLeastOneChild;
    }
};

TreeNode.prototype.filterByNumericColumn = function (columnDef, filterData) {

    if (this.hasChild()) {
        // Filter aggregations
        var allChildrenHidden = true;
        for (var i = 0; i < this.children.length; i++) {
            // Call recursively to filter leaf nodes first
            this.children[i].filterByNumericColumn(columnDef, filterData);
            // Check to see if all children are hidden, then hide parent if so
            if (this.children[i].hiddenByFilter == false) {
                allChildrenHidden = false;
            }
        }
        this.hiddenByFilter = allChildrenHidden;
    } else {
        // filter ultimateChildren
        var showAtLeastOneChild = false;
        for (var i = 0; i < this.ultimateChildren.length; i++) {
            var uChild = this.ultimateChildren[i];
            var row = {};
            row[columnDef.colTag] = uChild[columnDef.colTag];
            var filterOutNode = false;
            var formatConfig = buildLAFConfigObject(columnDef);
            var value = row[columnDef.colTag] * parseFloat(formatConfig.multiplier);
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
                    // rounding
                    value = value.toFixed(formatConfig.roundTo);
                    var filterValue = filterData[j].eq.toString().replace(/,/g, '');
                    if (!(parseFloat(value) == parseFloat(filterValue))) {
                        filterOutNode = true;
                    }
                }
            }

            uChild.hiddenByFilter = filterOutNode;
            showAtLeastOneChild = showAtLeastOneChild || !uChild.hiddenByFilter;
        }
        this.hiddenByFilter = !showAtLeastOneChild;
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
function rasterizeTree(options, hasSubtotalBy, exportOutside, skipSubtotalRow) {
    var node = options.node, firstColumn = options.firstColumn;
    var flatData = [];

    if (!skipSubtotalRow) {
        node = _decorateRowData(node, firstColumn, hasSubtotalBy, exportOutside);
        flatData = node.display == false ? [] : [node.rowData];
    }

    if (node.ultimateChildren.length == 1 && options.hideSingleSubtotalChild && node.parent) {
        // if the subtotal level only has one child, hide this child. only show subtotal row;
        node.ultimateChildren[0].hiddenBySingleSubtotalRow = true;
        //node.ultimateChildren[0].hiddenByFilter = true;
        if (node.hasChild()) {
            node.noCollapseIcon = false;
        } else {
            node.noCollapseIcon = true;
        }
    }

    if (exportOutside) {
        if (node.children.length > 0)
            _rasterizeChildren(flatData, options, hasSubtotalBy, exportOutside, skipSubtotalRow);
        else
            _rasterizeDetailRows(node, flatData,hasSubtotalBy);
    }
    else if (!node.collapsed) {
        if (node.children.length > 0)
            _rasterizeChildren(flatData, options, hasSubtotalBy, exportOutside, skipSubtotalRow);
        else
            _rasterizeDetailRows(node, flatData,hasSubtotalBy);
    }

    return flatData;
}

/**
 * when tree structure is changed, this function should be invoked
 */
function rasterizeTreeForRender() {
    addExtraColumnForSubtotalBy.call(this);

    const data = rasterizeTree({
        node: this.state.rootNode,
        firstColumn: this.state.columnDefs[0],
        hideSingleSubtotalChild: this.props.hideSingleSubtotalChild
    }, this.state.subtotalBy.length > 0);

    //those attributes of state is used by render() of ReactTable
	if(this.props.disableGrandTotal == true) {
		this.state.maxRows = data.length;
	}else{ 
		this.state.maxRows = data.length - 1;// maxRows is referenced later during event handling to determine upperVisualBound
		this.state.grandTotal = data.splice(0, 1).map(rowMapper, this);
	}
    this.state.rasterizedData = data;
    this.state.buildRasterizedData = false;
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _rasterizeChildren(flatData, options, hasSubtotalBy, exportOutside, skipSubtotalRow) {
    var node = options.node, firstColumn = options.firstColumn;
    var i, j, intermediateResult;
    for (i = 0; i < node.children.length; i++) {
        intermediateResult = rasterizeTree({
            hideSingleSubtotalChild: options.hideSingleSubtotalChild,
            node: node.children[i],
            firstColumn: firstColumn
        }, hasSubtotalBy, exportOutside, skipSubtotalRow);
        for (j = 0; j < intermediateResult.length; j++) {
            //
            if (!(intermediateResult[j].treeNode && intermediateResult[j].treeNode.hiddenByFilter))
                flatData.push(intermediateResult[j]);
        }
    }
}

function _rasterizeDetailRows(node, flatData,hasSubtotalBy) {
    for (var i = 0; i < node.ultimateChildren.length; i++) {
        var detailRow = node.ultimateChildren[i];
        //set to true only when has subtotaling
        var hiddenBySingleSubtotalRow = hasSubtotalBy &&detailRow.hiddenBySingleSubtotalRow;
        if (!(detailRow.hiddenByFilter || hiddenBySingleSubtotalRow)) {
            detailRow.sectorPath = node.rowData.sectorPath;
            detailRow.isDetail = true;
            detailRow.parent = node;
            detailRow.indexInParent = i;
            flatData.push(detailRow);
        }
    }
}

/**
 * enhances the `rowData` attribute of the give node with info
 * that will be useful for rendering/interactivity such as sectorPath
 */
function _decorateRowData(node, firstColumn, hasSubtotalBy, exportOutside) {
    node.rowData.sectorPath = node.getSectorPath();
    if (hasSubtotalBy) {
        node.rowData[firstColumn.colTag] = node.sectorTitle;
    }

    if (!exportOutside) {
        node.rowData.treeNode = node;
    }
    return node;
}