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
                        <div style={{"position": "relative"}} className="menu-item menu-item-hoverable">
                            <div>{menuItemTitle}</div>
                            <div className="menu-item-input" style={styles}>
                                <div style={{"display": "block"}}>
                                    {columnDef[table.props.customMenuItems[menuItemTitle][menuItemType]]}
                                </div>
                            </div>
                        </div>
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
            <div className="menu-item" onClick={table.handleAddSort.bind(null, columnDef, true)}>Add Sort Asc</div>,
            <div className="menu-item" onClick={table.handleAddSort.bind(null, columnDef, false)}>Add Sort Dsc</div>,
            <div className="menu-item" onClick={table.replaceData.bind(null, table.props.data, true)}>Clear Sort</div>
        ],
        filter:[
            <div className="menu-item" onClick={table.handleClearFilter.bind(null, columnDef)}>Clear Filter</div>,
            <div className="menu-item" onClick={table.handleClearAllFilters.bind(null)}>Clear All Filters</div>
        ],
        summarize: [
            <SummarizeControl table={table} columnDef={columnDef}/>,
            <div className="menu-item" onClick={table.handleGroupBy.bind(null, null)}>Clear Summary</div>
        ],
        remove: [
            <div className="menu-item" onClick={table.handleRemove.bind(null, columnDef)}>Remove Column</div>
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
        menuItems.push(<div className="separator"/>);
        if( !table.props.disableExporting ) {
            menuItems.push(<div className="menu-item" onClick={table.handleDownload.bind(null, "excel")}>Download as XLS</div>);
            menuItems.push(<div className="menu-item" onClick={table.handleDownload.bind(null, "pdf")}>Download as PDF</div>);
        }

        menuItems.push(<div className="menu-item" onClick={table.handleCollapseAll.bind(null, null)}>Collapse All</div>);
        menuItems.push(<div className="menu-item" onClick={table.handleExpandAll.bind(null)}>Expand All</div>);
    }

    return (
        <div style={menuStyle} className="rt-header-menu">
            {menuItems}
        </div>
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
    var textClasses = "btn-link rt-header-anchor-text" + (table.state.filterInPlace[columnDef.colTag] ? " rt-hide" : "");
    var ss = {
        width: "100%",
        height: "13px",
        padding: "0"
    };
    var firstColumn = (
        <div className="rt-headers-container"
            onDoubleClick={table.state.sortAsc === undefined || table.state.sortAsc === null || columnDef != table.state.columnDefSorted ?
                table.handleSort.bind(null, columnDef, true) :
                (columnDef == table.state.columnDefSorted && table.state.sortAsc ?
                    table.handleSort.bind(null, columnDef, false) : table.replaceData.bind(null, table.props.data, true))}>
            <div style={{textAlign: "center"}} className="rt-header-element" key={columnDef.colTag}>
                <a className={textClasses}
                   onClick={table.props.filtering && table.props.filtering.disable ? null : toggleFilterBox.bind(null, table, columnDef.colTag)}>
                    {table.state.firstColumnLabel.join("/")}
                </a>
                <input style={ss} className={("rt-" + columnDef.colTag + "-filter-input rt-filter-input") + (table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide")}
                    onChange={table.handleColumnFilter.bind(null, columnDef)}
                    onKeyDown={pressedKey.bind(null, table, columnDef.colTag)}/>
            </div>
            <div className="rt-caret-container">
                {table.state.sortAsc != undefined && table.state.sortAsc === true &&
                columnDef === table.state.columnDefSorted ? <div className="rt-upward-caret"></div> : null}
                {table.state.sortAsc != undefined && table.state.sortAsc === false &&
                columnDef === table.state.columnDefSorted ? <div className="rt-downward-caret"></div> : null}
            </div>
            {buildMenu({table: table, columnDef: columnDef, style: {textAlign: "left"}, isFirstColumn: true})}
        </div>
    );
    var headerColumns = [firstColumn];
    for (i = 1; i < table.state.columnDefs.length; i++) {
        columnDef = table.state.columnDefs[i];
        style = {textAlign: "center"};
        var textClasses = "btn-link rt-header-anchor-text" + (table.state.filterInPlace[columnDef.colTag] ? " rt-hide" : "");
        // bound this on <a> tag: onClick={table.props.disableFilter ? null : toggleFilterBox.bind(null, table, columnDef.colTag)}}
        headerColumns.push(
            <div className="rt-headers-container"
                onDoubleClick={table.state.sortAsc === undefined || table.state.sortAsc === null || columnDef != table.state.columnDefSorted ?
                               table.handleSort.bind(null, columnDef, true) :
                                  (columnDef == table.state.columnDefSorted && table.state.sortAsc ?
                                   table.handleSort.bind(null, columnDef, false) : table.replaceData.bind(null, table.props.data, true))}>
                <div style={style} className="rt-header-element rt-info-header" key={columnDef.colTag}>
                    <a className={textClasses}
                       onClick={table.props.filtering && table.props.filtering.disable ? null : toggleFilterBox.bind(null, table, columnDef.colTag)}>
                        {columnDef.text}
                    </a>
                    <input style={ss} className={("rt-" + columnDef.colTag + "-filter-input rt-filter-input") + (table.state.filterInPlace[columnDef.colTag] ? "" : " rt-hide")}
                           onChange={table.handleColumnFilter.bind(null, columnDef)}
                           onKeyDown={pressedKey.bind(null, table, columnDef.colTag)}/>
                </div>
                <div className="rt-caret-container">
                    {table.state.sortAsc != undefined && table.state.sortAsc === true &&
                    columnDef === table.state.columnDefSorted ? <div className="rt-upward-caret"></div> : null}
                    {table.state.sortAsc != undefined && table.state.sortAsc === false &&
                    columnDef === table.state.columnDefSorted ? <div className="rt-downward-caret"></div> : null}
                </div>
                {buildMenu({table: table, columnDef: columnDef, style: style, isFirstColumn: false})}
            </div>
        );
    }

    var corner;
    var classString = "btn-link rt-plus-sign";
    if( !table.props.disableAddColumnIcon && table.props.cornerIcon ){
        corner = <img src={table.props.cornerIcon}/>;
        classString = "btn-link rt-corner-image";
    }


    // the plus sign at the end
    headerColumns.push(
        <span className="rt-header-element rt-add-column" style={{"textAlign": "center"}}>
            <a className={classString} onClick={table.props.disableAddColumn ? null : table.handleAdd}>
                <strong>{corner ? corner : (table.props.disableAddColumn ? '' : '+')}</strong>
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
                        {data.treeNode.collapsed ? '+' : '—'}
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
