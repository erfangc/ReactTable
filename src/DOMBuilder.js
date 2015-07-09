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
            <SubMenu menuItem={<span><i className="fa fa-sort"></i> Sort</span>} subMenu={
                <div className="rt-header-menu" style={subMenuStyles}>
                    <div className="menu-item" onClick={table.handleSetSort.bind(null, columnDef, 'asc')}>
                        <i className="fa fa-sort-alpha-asc"/> Asc
                    </div>
                    <div className="menu-item" onClick={table.handleSetSort.bind(null, columnDef, 'desc')}>
                        <i className="fa fa-sort-alpha-desc"></i> Desc
                    </div>
                    <div className="separator"></div>
                    <div className="menu-item" onClick={table.handleAddSort.bind(null, columnDef, 'asc')}>
                        <i className="fa fa-plus"/><i className="fa fa-sort-alpha-asc"/> Add Asc
                    </div>
                    <div className="menu-item" onClick={table.handleAddSort.bind(null, columnDef, 'desc')}>
                        <i className="fa fa-plus"/><i className="fa fa-sort-alpha-desc"></i> Add Desc
                    </div>
                    <div className="separator"></div>
                    <div className="menu-item" onClick={table.clearSort}><i className="fa fa-ban"></i> Clear All Sort</div>
                </div>}>
            </SubMenu>
        ],
        filter: [
            <div className="menu-item" onClick={table.handleClearFilter.bind(null, columnDef)}>Clear Filter</div>,
            <div className="menu-item" onClick={table.handleClearAllFilters}>Clear All Filters</div>,
            <div className="separator"/>
        ],
        summarize: [
            <SubMenu menuItem={<span>Subtotal</span>} subMenu={
                <div className="rt-header-menu" style={subMenuStyles}>
                   <SubtotalControl table={table} columnDef={columnDef}/>
                    <div className="menu-item" onClick={table.handleClearSubtotal}>Clear Subtotal</div>
                </div>
            }></SubMenu>
        ],
        remove: [
            <div className="menu-item" onClick={table.handleRemove.bind(null, columnDef)}>Remove Column</div>
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
        menuItems.push(<div className="separator"/>);
        if (!table.props.disableExporting) {
            menuItems.push(<div className="menu-item" onClick={table.handleDownload.bind(null, "excel")}><i
                className="fa fa-file-excel-o"></i> Download as XLS</div>);
            menuItems.push(<div className="menu-item" onClick={table.handleDownload.bind(null, "pdf")}><i
                className="fa fa-file-pdf-o"></i> Download as PDF</div>);
        }

        menuItems.push(<div className="menu-item" onClick={table.handleCollapseAll}>Collapse
            All</div>);
        menuItems.push(<div className="menu-item" onClick={table.handleExpandAll}>Expand All</div>);
    }

    return (
        <div style={menuStyle} className="rt-header-menu">
            {menuItems}
        </div>
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
            <i className={"fa fa-sort-"+sortDef.sortType}></i>;
    var textClasses = "btn-link rt-header-anchor-text" + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? " rt-hide" : "");
    var numericPanelClasses = "rt-numeric-filter-container" + (columnDef.format === "number" && table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide");
    var ss = {
        width: "100%",
        height: "13px",
        padding: "0"
    };
    var firstColumn = (
        <div className="rt-headers-container">
            <div style={{textAlign: "center"}} onDoubleClick={table.handleSetSort.bind(null,columnDef, null)}
                 className="rt-header-element" key={columnDef.colTag}>
                <a href="#" className={textClasses}
                   onClick={table.props.filtering && table.props.filtering.disable ? null : toggleFilterBox.bind(null, table, columnDef.colTag)}>
                    {buildFirstColumnLabel(table).join("/")}
                </a>
                {sortIcon}
                <input style={ss}
                       className={("rt-" + columnDef.colTag + "-filter-input rt-filter-input") + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? "" : " rt-hide")}
                       onChange={table.handleColumnFilter.bind(null, columnDef)}
                       onKeyDown={pressedKey.bind(null, table, columnDef.colTag)}/>
            </div>
            <div className={numericPanelClasses}>
                <NumericFilterPanel></NumericFilterPanel>
            </div>
            {table.state.filterInPlace[columnDef.colTag] ? null : buildMenu({
                table: table,
                columnDef: columnDef,
                style: {textAlign: "left"},
                isFirstColumn: true
            })}
        </div>
    );
    var headerColumns = [firstColumn];
    for (i = 1; i < table.state.columnDefs.length; i++) {
        columnDef = table.state.columnDefs[i];
        sortDef = findDefByColTag(table.state.sortBy, columnDef.colTag);
        sortIcon = null;
        if (sortDef)
            sortIcon =
                <i className={"fa fa-sort-"+sortDef.sortType}></i>;

        style = {textAlign: "center"};
        numericPanelClasses = "rt-numeric-filter-container" + (columnDef.format === "number" && table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide");
        textClasses = "btn-link rt-header-anchor-text" + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? " rt-hide" : "");
        headerColumns.push(
            <div className="rt-headers-container">
                <div onDoubleClick={table.handleSetSort.bind(null,columnDef, null)} style={style}
                     className="rt-header-element rt-info-header" key={columnDef.colTag}>
                    <a href="#" className={textClasses}
                       onClick={table.props.filtering && table.props.filtering.disable ? null : toggleFilterBox.bind(null, table, columnDef.colTag)}>
                        <span>{columnDef.text} {columnDef.isLoading ?
                            <i className="fa fa-spinner fa-spin"></i> : null}</span>
                    </a>
                    {sortIcon}
                    <input style={ss}
                           className={("rt-" + columnDef.colTag + "-filter-input rt-filter-input") + (table.state.filterInPlace[columnDef.colTag] && columnDef.format !== "number" ? "" : " rt-hide")}
                           onChange={table.handleColumnFilter.bind(null, columnDef)}
                           onKeyDown={pressedKey.bind(null, table, columnDef.colTag)}/>
                </div>
                <div className={numericPanelClasses}>
                    <NumericFilterPanel clearFilter={table.handleClearFilter}
                                        addFilter={table.handleColumnFilter}
                                        colDef={columnDef}
                                        currentFilters={table.state.currentFilters}></NumericFilterPanel>
                </div>
                {table.state.filterInPlace[columnDef.colTag] ? null : buildMenu({
                    table: table,
                    columnDef: columnDef,
                    style: style,
                    isFirstColumn: false
                })}
            </div>
        );
    }

    var corner;
    var classString = "btn-link rt-plus-sign";
    if (!table.props.disableAddColumnIcon && table.props.cornerIcon) {
        corner = <img src={table.props.cornerIcon}/>;
        classString = "btn-link rt-corner-image";
    }


    // the plus sign at the end
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
        return <td key={firstColTag}
                   onDoubleClick={this.props.filtering && this.props.filtering.doubleClickCell ?
                     this.props.handleColumnFilter(null, columnDef) : null}>
            {data[firstColTag]}
        </td>;

    // styling & ident
    var identLevel = !data.isDetail ? data.sectorPath.length - 1 : data.sectorPath.length;
    var firstCellStyle = {
        "paddingLeft": (10 + identLevel * 25) + "px"
    };

    userDefinedElement = (!data.isDetail && columnDef.summaryTemplate) ? columnDef.summaryTemplate.call(null, data) : null;

    if (data.isDetail)
        result = <td style={firstCellStyle} key={firstColTag}
                     onDoubleClick={this.props.filtering && this.props.filtering.doubleClickCell ?
                this.props.handleColumnFilter(null, columnDef) : null}>
            {data[firstColTag]}</td>;
    else {
        result =
            (
                <td style={firstCellStyle} key={firstColTag}>
                    <a onClick={toggleHide.bind(null, data)} className="btn-link rt-expansion-link">
                        {data.treeNode.collapsed ? <i className="fa fa-plus"/> : <i className="fa fa-minus"/>}
                    </a>
                    &nbsp;&nbsp;
                    <strong>{data[firstColTag]}</strong>
                    {userDefinedElement}
                </td>
            );
    }
    return result;
}

function buildFooter(table, paginationAttr) {
    return table.props.columnDefs.length > 0 && !table.props.disablePagination ?
        (<PageNavigator
            items={paginationAttr.allPages.slice(paginationAttr.pageDisplayRange.start, paginationAttr.pageDisplayRange.end)}
            activeItem={table.state.currentPage}
            numPages={paginationAttr.pageEnd}
            handleClick={table.handlePageClick}/>) : null;
}
