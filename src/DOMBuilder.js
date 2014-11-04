/* Virtual DOM builder helpers */

function buildMenu(options) {
    var table = options.table,
        columnDef = options.columnDef,
        style = options.style,
        isFirstColumn = options.isFirstColumn, menuStyle = {};

    if (style.textAlign == 'right')
        menuStyle.right = "0%";
    else
        menuStyle.left = "0%";

    // TODO turn this into a React Component
    var summarizeMenuItem = (
        <div style={{"position": "relative"}} className="menu-item">
            <div onClick={table.handleGroupBy.bind(table, columnDef)}>Summarize</div>
            <div className="menu-item-input" onHover style={{"position":"absolute", "top" : "0%", "left": "100%"}}>
                <label>Enter Bucket(s)</label><input placeholder="ex: 1,10,15"/><a onClick={table.handleGroupBy.bind(table, columnDef)} className="btn-link">Ok</a>
            </div>
        </div>
    );

    var menuItems = [
        <div className="menu-item" onClick={table.handleSort.bind(table, columnDef, true)}>Sort Asc</div>,
        <div className="menu-item" onClick={table.handleSort.bind(table, columnDef, false)}>Sort Dsc</div>,
        summarizeMenuItem
    ];

    if (isFirstColumn) {
        menuItems.push(<div className="separator"/>);
        menuItems.push(<div className="menu-item" onClick={table.handleGroupBy.bind(table, null)}>Clear Summary</div>);
        menuItems.push(<div className="menu-item" onClick={table.handleCollapseAll.bind(table, null)}>Collapse All</div>);
        menuItems.push(<div className="menu-item" onClick={table.handleExpandAll.bind(table)}>Expand All</div>);
    } else
        menuItems.push(<div className="menu-item" onClick={table.handleRemove.bind(table, columnDef)}>Remove Column</div>);

    return (
        <div style={menuStyle} className="rt-header-menu">
            {menuItems}
        </div>
    );
}

function buildHeaders(table) {
    var columnDef = table.state.columnDefs[0], i, style = {};
    var firstColumn = (
        <div style={{textAlign: "left"}} className="rt-header-element" key={columnDef.colTag}>
            <a className="btn-link">{columnDef.text}</a>
            {buildMenu({table: table, columnDef: columnDef, style: {textAlign: "left"}, isFirstColumn: true})}
        </div>
    );
    var headerColumns = [firstColumn];
    for (i = 1; i < table.state.columnDefs.length; i++) {
        columnDef = table.state.columnDefs[i];
        style = {textAlign: getColumnAlignment(columnDef)};
        headerColumns.push(
            <div style={style} className="rt-header-element" key={columnDef.colTag}>
                <a className="btn-link">{columnDef.text}</a>
                {buildMenu({table: table, columnDef: columnDef, style: style, isFirstColumn: false})}
            </div>
        );
    }
    // the plus sign at the end
    headerColumns.push(
        <span className="rt-header-element rt-add-column" style={{"textAlign": "center"}}>
            <a className="btn-link" onClick={table.handleAdd}>
                <strong>{"+"}</strong>
            </a>
        </span>);
    return (
        <div key="header" className="rt-headers">{headerColumns}</div>
    );
}

function buildFirstCellForRow(props) {
    var data = props.data, columnDef = props.columnDefs[0], toggleHide = props.toggleHide;
    var firstColTag = columnDef.colTag;

    // if sectorPath is not available - return a normal cell
    if (!data.sectorPath)
        return <td key={firstColTag}>{data[firstColTag]}</td>;

    // styling & ident
    var identLevel = !data.isDetail ? data.sectorPath.length - 1 : data.sectorPath.length;
    var firstCellStyle = {
        "paddingLeft": (10 + identLevel * 25) + "px", "borderRight": "1px #ddd solid"
    };

    if (data.isDetail) {
        var result = <td style={firstCellStyle} key={firstColTag}>{data[firstColTag]}</td>;
    } else {
        result =
            (
                <td style={firstCellStyle} key={firstColTag}>
                    <a onClick={toggleHide.bind(null, data)} className="btn-link">
                        <strong>{data[firstColTag]}</strong>
                    </a>
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
