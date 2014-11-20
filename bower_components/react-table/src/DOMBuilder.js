/** @jsx React.DOM */
/* Virtual DOM builder helpers */

function buildCustomMenuItems(table, columnDef) {
    var menuItems = [];
    if (columnDef.customMenuItems) {
        menuItems.push(<div className="separator"/>, columnDef.customMenuItems(table, columnDef));
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

    var summarizeMenuItem = <SummarizeControl table={table} columnDef={columnDef}/>;

    // construct user custom menu items
    var customMenuItems = buildCustomMenuItems(table, columnDef);

    var menuItems = [
        <div className="menu-item" onClick={table.handleSort.bind(null, columnDef, true)}>Sort Asc</div>,
        <div className="menu-item" onClick={table.handleSort.bind(null, columnDef, false)}>Sort Dsc</div>,
        summarizeMenuItem,
        <div className="menu-item" onClick={table.handleGroupBy.bind(null, null)}>Clear Summary</div>
    ];

    if (isFirstColumn) {
        menuItems.push(<div className="separator"/>);
        menuItems.push(<div className="menu-item" onClick={table.handleCollapseAll.bind(null, null)}>Collapse All</div>);
        menuItems.push(<div className="menu-item" onClick={table.handleExpandAll.bind(null)}>Expand All</div>);
    } else
        menuItems.push(<div className="menu-item" onClick={table.handleRemove.bind(null, columnDef)}>Remove Column</div>);
    menuItems.push(customMenuItems);
    return (
        <div style={menuStyle} className="rt-header-menu">
            {menuItems}
        </div>
    );
}

function buildHeaders(table) {
    var columnDef = table.state.columnDefs[0], i, style = {};
    var firstColumn = (
        <div className="rt-headers-container">
            <div style={{textAlign: "center"}} className="rt-header-element" key={columnDef.colTag}>
                <a className="btn-link rt-header-anchor-text">{table.state.firstColumnLabel.join("/")}</a>
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
        headerColumns.push(
            <div className="rt-headers-container">
                <div style={style} className="rt-header-element rt-info-header" key={columnDef.colTag}>
                    <a className="btn-link rt-header-anchor-text">{columnDef.text}</a>
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
    // the plus sign at the end
    headerColumns.push(
        <span className="rt-header-element rt-add-column" style={{"textAlign": "center"}}>
            <a className="btn-link rt-plus-sign" onClick={table.handleAdd}>
                <strong>{"+"}</strong>
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

function buildFirstCellForRow(props) {
    var data = props.data, columnDef = props.columnDefs[0], toggleHide = props.toggleHide;
    var firstColTag = columnDef.colTag, userDefinedElement, result;

    // if sectorPath is not available - return a normal cell
    if (!data.sectorPath)
        return <td key={firstColTag}>{data[firstColTag]}</td>;

    // styling & ident
    var identLevel = !data.isDetail ? data.sectorPath.length - 1 : data.sectorPath.length;
    var firstCellStyle = {
        "paddingLeft": (10 + identLevel * 25) + "px"
    };

    userDefinedElement = (!data.isDetail && columnDef.summaryTemplate) ? columnDef.summaryTemplate.call(null, data) : null;

    if (data.isDetail)
        result = <td style={firstCellStyle} key={firstColTag}>{data[firstColTag]}</td>;
    else {
        result =
            (
                <td style={firstCellStyle} key={firstColTag}>
                    <a onClick={toggleHide.bind(null, data)} className="btn-link">
                        <strong>{data[firstColTag]}</strong>
                    </a>
                    {userDefinedElement}
                </td>
            );
    }
    return result;
}

function buildFooter(table, paginationAttr) {
    return table.props.columnDefs.length > 0 ?
        (<PageNavigator
            items={paginationAttr.allPages.slice(paginationAttr.pageDisplayRange.start, paginationAttr.pageDisplayRange.end)}
            activeItem={table.state.currentPage}
            numPages={paginationAttr.pageEnd}
            handleClick={table.handlePageClick}/>) : null;
}
