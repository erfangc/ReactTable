/** @jsx React.DOM */
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
            <SubMenu onMenuClick={table.handleSetSort.bind(null, columnDef, null)}
                menuItem={<span>
                    <i className="fa fa-sort"></i>
                Sort</span>} subMenu={
                <div className="rt-header-menu" style={subMenuStyles}>
                    <div className="menu-item" onClick={table.handleSetSort.bind(null, columnDef, 'asc')}>
                        <i className="fa fa-sort-alpha-asc"/>
                    Asc
                    </div>
                    <div className="menu-item" onClick={table.handleSetSort.bind(null, columnDef, 'desc')}>
                        <i className="fa fa-sort-alpha-desc"></i>
                    Desc
                    </div>
                    <div className="separator"></div>
                    <div className="menu-item" onClick={table.handleAddSort.bind(null, columnDef, 'asc')}>
                        <i className="fa fa-plus"/>
                        <i className="fa fa-sort-alpha-asc"/>
                    Add Asc
                    </div>
                    <div className="menu-item" onClick={table.handleAddSort.bind(null, columnDef, 'desc')}>
                        <i className="fa fa-plus"/>
                        <i className="fa fa-sort-alpha-desc"></i>
                    Add Desc
                    </div>
                    <div className="separator"></div>
                    <div className="menu-item" onClick={table.clearSort}>
                        <i className="fa fa-ban"></i>
                    Clear All Sort</div>
                </div>}>
            </SubMenu>
        ],
        filter: [
            <SubMenu
                menuItem={<span>
                    <i className="fa fa-filter"></i>
                Filter</span>}
                subMenu={
                    <div className="rt-header-menu" style={subMenuStyles}>
                        <div className="menu-item" onClick={clickFilterMenu.bind(null, table, columnDef)}>
                            <i className="fa fa-filter"></i>
                        Filter</div>
                        <div className="separator"/>
                        <div className="menu-item" onClick={table.handleClearFilter.bind(null, columnDef)}>Clear Filter</div>
                        <div className="menu-item" onClick={table.handleClearAllFilters}>Clear All Filters</div>
                    </div>
                    }>
            </SubMenu>
        ],
        summarize: [
            <SubMenu
                onMenuClick={columnDef.format == 'number' || columnDef == 'currency' ? null : table.handleSubtotalBy.bind(null, columnDef, null)}
                menuItem={<span>
                    <i className="fa fa-list-ul"></i>
                Subtotal</span>}
                subMenu={columnDef.format == DATE_FORMAT && columnDef.formatInstructions != null ?
                    <div className="rt-header-menu" style={subMenuStyles}>
                        <SubtotalControl table={table} columnDef={columnDef}/>
                        <SubtotalControlForDates freq= {DAILY} table={table} columnDef={columnDef}/>
                        <SubtotalControlForDates freq= {WEEKLY} table={table} columnDef={columnDef}/>
                        <SubtotalControlForDates freq= {MONTHLY} table={table} columnDef={columnDef}/>
                        <SubtotalControlForDates freq= {QUARTERLY} table={table} columnDef={columnDef}/>
                        <SubtotalControlForDates freq= {YEARLY} table={table} columnDef={columnDef}/>
                        <div className="menu-item" onClick={table.handleClearSubtotal}>
                            <i className="fa fa-ban"></i>
                        Clear All Subtotal</div>
                    </div> :
                    <div className="rt-header-menu" style={subMenuStyles}>
                        <SubtotalControl table={table} columnDef={columnDef}/>
                        <div className="menu-item" onClick={table.handleClearSubtotal}>
                            <i className="fa fa-ban"></i>
                        Clear All Subtotal</div>
                    </div>
                    }
            >
            </SubMenu>
        ],

        summarizeClearAll: [
            <SubMenu
                menuItem={<span>
                    <i className="fa fa-list-ul"></i>
                Subtotal</span>}
                subMenu={
                    <div className="rt-header-menu" style={subMenuStyles}>
                        <div className="menu-item" onClick={table.handleClearSubtotal}>
                            <i className="fa fa-ban"></i>
                        Clear All Subtotal</div>
                    </div>
                    }></SubMenu>
        ],
        remove: [
            <div className="menu-item" onClick={table.handleRemove.bind(null, columnDef)}>
                <i
                    className="fa fa-remove"></i>
            Remove Column</div>
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
        if (!isFirstColumn) {
            menuItems.push(<div className="separator"/>);
            addMenuItems(menuItems, availableDefaultMenuItems.remove);
        }

    }

    var customMenuItems = buildCustomMenuItems(table, columnDef);
    menuItems.push(customMenuItems);

    if (isFirstColumn) {
        menuItems.push(<div className="separator"/>);
        if (!table.props.disableExporting) {
            menuItems.push(<div className="menu-item" onClick={table.handleDownload.bind(null, "excel")}>
                <i
                    className="fa fa-file-excel-o"></i>
            Download as XLS</div>);
            menuItems.push(<div className="menu-item" onClick={table.handleDownload.bind(null, "pdf")}>
                <i
                    className="fa fa-file-pdf-o"></i>
            Download as PDF</div>);
        }

        menuItems.push(<div className="menu-item" onClick={table.handleCollapseAll}>Collapse
        All</div>);
        menuItems.push(<div className="menu-item" onClick={table.handleExpandAll}>Expand All</div>);
    }

    return (
        <div style={menuStyle} className={("rt-header-menu") + (table.state.filterInPlace[columnDef.colTag] ? " rt-hide" : "")}>
            {menuItems}
        </div>
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
        <option value="default" style={{display: 'none'}}></option>
    );
    //}
    for(var i = 0; i< filterData.length; i++){
        var label = filterData[i];
        if(columnDef.format == DATE_FORMAT && columnDef.formatInstructions!=null){
            label = moment(parseInt(label)).format(columnDef.formatInstructions)
        }

        filterList.push(
            <option value={filterData[i]}>{label}</option>
        );
    }

    var selectedFilters = [];
    table.state.currentFilters.forEach(function(filter){
       if(filter.colDef === columnDef){
           filter.filterText.forEach(function(filter, index){
               if(columnDef.format == DATE_FORMAT && columnDef.formatInstructions!=null){
                   filter = moment(parseInt(filter)).format(columnDef.formatInstructions)
               }
		   
               selectedFilters.push(
                   <div style={{display: 'block', marginTop:'2px'}}>
                       <input className={"rt-" + columnDef.colTag + "-filter-input rt-filter-input"}
                           type="text" value={filter} readOnly />
                       <i  style={{float: 'right', 'marginTop':'5px', 'marginRight':'4%'}} className={"fa fa-minus"}
                           onClick={removeFilter.bind(null,table , columnDef,index)}>
                       </i>
                   </div>
               )
           });
       }
    });
    return (
        <div className={("rt-select-filter-container ") + (table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide")}
            ref={'select-filter-' + columnDef.colTag}>
            <div style={{display: 'block', marginBottom: '2px'}}>
                <select
                    className={"rt-" + columnDef.colTag + "-filter-select rt-filter-select"}
                    onChange={addFilter.bind(null, table, columnDef)}
                    onKeyDown={pressedKey.bind(null, table, columnDef.colTag)}
                    value={filterData.length > 1 ? "default" : filterData[0]} >
                    {filterList}
                </select>
                <i style={{float: 'right', 'marginTop': '5px', 'marginRight': '4%'}}
                    className="fa fa-filter" onClick={filter.bind(table, table, columnDef)}></i>
            </div>
            <div className={("separator") + ( selectedFilters.length == 0 ? " rt-hide" : "")}></div>
            <div style={{display: 'block'}}>
                {selectedFilters}
            </div>
        </div>
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
            sortIcon = (<span style={{marginLeft: '3px'}}>
                <i style={{marginTop: '2px'}} className={"fa fa-long-arrow-" + type}></i>
                <sup style={{marginLeft: '2px'}}>{idx}</sup>
            </span>);
        }
        var style = {textAlign: "center"};
        var numericPanelClasses = "rt-numeric-filter-container" + (columnDef.format === "number" && table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide");
        var textClasses = "btn-link rt-header-anchor-text";

        // to determine if a column has been filtered. need update accordingly.
        var isFiltered = columnDef.isFiltered ? true : false;

        headerColumns.push(
            <div className="rt-headers-container" ref={"header-" + columnDef.colTag}>
                <div onDoubleClick={table.handleSetSort.bind(null, columnDef, null)} style={style}
                    className="rt-header-element rt-info-header" key={columnDef.colTag}>
                    <a className={textClasses}
                        onClick={table.props.filtering && table.props.filtering.disable ? null : toggleFilterBox.bind(table, table, columnDef)}>
                        {buildHeaderLabel(table, columnDef, isFirstColumn)}
                        {sortIcon}
                        <i style={{marginLeft: '4px'}} className={("fa fa-filter fa-inverse") + (isFiltered ? "" : " rt-hide")}></i>
                    </a>
                </div>
                { table.state.filterInPlace[columnDef.colTag] && columnDef.format === "number" ?
                    (<div className={numericPanelClasses} ref={"numericFilterPanel-" + columnDef.colTag}>
                        <NumericFilterPanel clearFilter={table.handleClearFilter}
                            addFilter={table.handleColumnFilter}
                            colDef={columnDef}
                            currentFilters={table.state.currentFilters}>
                        </NumericFilterPanel>
                    </div>) : null }
                {table.state.filterInPlace[columnDef.colTag] ? buildFilterList(table, columnDef) : null}
                {buildMenu({
                    table: table,
                    columnDef: columnDef,
                    style: style,
                    isFirstColumn: isFirstColumn
                })}
            </div>
        );
    }

    var corner;
    var classString = "btn-link rt-plus-sign";
    if (!table.props.disableAddColumn && table.props.cornerIcon) {
        corner = <img src={table.props.cornerIcon}/>;
        classString = "btn-link rt-corner-image";
    }

    // the plus sign at the end to add columns
    headerColumns.push(
        <span className="rt-header-element rt-add-column" style={{"textAlign": "center"}}>
            <a className={classString} onClick={table.props.disableAddColumn ? null : table.handleAdd}>
                <strong>{corner ? corner : (table.props.disableAddColumn ? '' : <i className="fa fa-plus"/>)}</strong>
            </a>
        </span>);

    return (
        <div className="rt-headers-grand-container">
            <div key="header" className="rt-headers">
                {headerColumns}
            </div>
        </div>
    );
}

function buildHeaderLabel(table, columnDef, isFirstColumn) {
    return isFirstColumn ? buildFirstColumnLabel(table) : (<span>{columnDef.text} {columnDef.isLoading ? <i className="fa fa-spinner fa-spin"></i> : null}</span>);
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
            <div  key={firstColTag} className="rt-grand-total-cell">
                <div style={firstCellStyle} className="rt-grand-total-cell-content">
                        {data[firstColTag] ? data[firstColTag] : <span>&nbsp;</span>}
                </div>
            </div>
        );
    } else if (isSubtotalRow) {
        var noCollapseIcon = data.treeNode.noCollapseIcon;

        result = (
            <td key={firstColTag} >
                <div >
                { hasCheckbox ? <span style={{'paddingLeft': '10px'}}>
                    <input checked={props.data.treeNode.isChecked} type="checkbox" onClick={clickCheckbox.bind(null, props, true)}/>
                </span> : ''}
                    <a style={firstCellStyle} onClick={toggleHide.bind(null, data)} className="btn-link rt-expansion-link">
                        { noCollapseIcon ? '' : data.treeNode.collapsed ? <i className="fa fa-plus"/> : <i className="fa fa-minus"/>}
                    </a>
                &nbsp;&nbsp;
                    <strong>{data[firstColTag]}</strong>
                    {userDefinedElement}
                </div>
            </td>
        );
    } else if (!isSubtotalRow) {
        result = (
            <td key={firstColTag} >
                { hasCheckbox ? <span style={{'paddingLeft': '10px'}}>
                    <input checked={props.data.isChecked} type="checkbox" onClick={clickCheckbox.bind(null, props, false)}/>
                </span> : ''}
            </td>
        );
        return result;
    }

    return result;
}

function buildPageNavigator(table, paginationAttr) {
    return table.props.columnDefs.length > 0 && !table.props.disablePagination ?
        (<PageNavigator
            items={paginationAttr.allPages.slice(paginationAttr.pageDisplayRange.start, paginationAttr.pageDisplayRange.end)}
            activeItem={table.state.currentPage}
            numPages={paginationAttr.pageEnd}
            handleClick={table.handlePageClick}/>) : null;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function buildFooter(paginationAttr, rowNum) {
    var start = paginationAttr.lowerVisualBound + 1;
    var end = Math.min(paginationAttr.upperVisualBound + 1, rowNum);

    return (
        <div>
            <p className='rt-display-inline rt-footer-count'>
                {"Showing " + start + " to " + end + " rows out of " + numberWithCommas(rowNum) + " rows"}
            </p>
            {this.props.disableInfiniteScrolling ? buildPageNavigator(this, paginationAttr) : null}
        </div>
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
}