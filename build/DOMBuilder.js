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
        React.createElement("div", {style: {"position": "relative"}, className: "menu-item"}, 
            React.createElement("div", {onClick: table.handleGroupBy.bind(table, columnDef)}, "Summarize"), 
            React.createElement("div", {className: "menu-item-input", onHover: true, style: {"position":"absolute", "top" : "0%", "left": "100%"}}, 
                React.createElement("label", null, "Enter Bucket(s)"), React.createElement("input", {placeholder: "ex: 1,10,15"}), React.createElement("a", {onClick: table.handleGroupBy.bind(table, columnDef), className: "btn-link"}, "Ok")
            )
        )
    );

    var menuItems = [
        React.createElement("div", {className: "menu-item", onClick: table.handleSort.bind(table, columnDef, true)}, "Sort Asc"),
        React.createElement("div", {className: "menu-item", onClick: table.handleSort.bind(table, columnDef, false)}, "Sort Dsc"),
        summarizeMenuItem
    ];

    if (isFirstColumn) {
        menuItems.push(React.createElement("div", {className: "separator"}));
        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleGroupBy.bind(table, null)}, "Clear Summary"));
        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleCollapseAll.bind(table, null)}, "Collapse All"));
        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleExpandAll.bind(table)}, "Expand All"));
    } else
        menuItems.push(React.createElement("div", {className: "menu-item", onClick: table.handleRemove.bind(table, columnDef)}, "Remove Column"));

    return (
        React.createElement("div", {style: menuStyle, className: "rt-header-menu"}, 
            menuItems
        )
    );
}

function buildHeaders(table) {
    var columnDef = table.state.columnDefs[0], i, style = {};
    var firstColumn = (
        React.createElement("div", {style: {textAlign: "left"}, className: "rt-header-element", key: columnDef.colTag}, 
            React.createElement("a", {className: "btn-link"}, columnDef.text), 
            buildMenu({table: table, columnDef: columnDef, style: {textAlign: "left"}, isFirstColumn: true})
        )
    );
    var headerColumns = [firstColumn];
    for (i = 1; i < table.state.columnDefs.length; i++) {
        columnDef = table.state.columnDefs[i];
        style = {textAlign: getColumnAlignment(columnDef)};
        headerColumns.push(
            React.createElement("div", {style: style, className: "rt-header-element", key: columnDef.colTag}, 
                React.createElement("a", {className: "btn-link"}, columnDef.text), 
                buildMenu({table: table, columnDef: columnDef, style: style, isFirstColumn: false})
            )
        );
    }
    // the plus sign at the end
    headerColumns.push(
        React.createElement("span", {className: "rt-header-element rt-add-column", style: {"textAlign": "center"}}, 
            React.createElement("a", {className: "btn-link", onClick: table.handleAdd}, 
                React.createElement("strong", null, "+")
            )
        ));
    return (
        React.createElement("div", {key: "header", className: "rt-headers"}, headerColumns)
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
        "paddingLeft": (10 + identLevel * 25) + "px", "borderRight": "1px #ddd solid"
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
