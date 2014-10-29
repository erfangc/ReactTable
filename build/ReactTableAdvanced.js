/** @jsx React.DOM */

// TODO handle click events for summary rows
// TODO consider making defensive deep copy of the data - since we are modifying it (performance vs. correctness trade off)
// TODO formatting
// TODO lastly, pagination if at all possible ... I don't see how

var SECTOR_SEPARATOR = "#";

function getInitiallyCollapsedSectorPaths(data) {
    var result = {};
    data.map(function (row) {
        if (row.sectorPath && row.isDetail) {
            var sectorPathKey = generateSectorKey(row.sectorPath);
            if (!result[sectorPathKey])
                result[sectorPathKey] = row.sectorPath;
        }
    });
    return result;
}
var Table = React.createClass({displayName: 'Table',
    getInitialState: function () {
        var data = prepareTableData.call(this, this.props);
        var collapsedSectorPaths = getInitiallyCollapsedSectorPaths(data);
        return {
            data: data,
            columnDefs: this.props.columnDefs,
            collapsedSectorPaths: collapsedSectorPaths
        };
    },
    handleSort: function (columnDefToSortBy) {
        var data = this.state.data;
        var sortOptions = {
            sectorSorter: defaultSectorSorter,
            detailSorter: getSortFunction(columnDefToSortBy),
            sortDetailBy: columnDefToSortBy
        };
        data.sort(sorterFactory.call(this, sortOptions));
        columnDefToSortBy.asc = !columnDefToSortBy.asc;
        this.setState({
            data: data
        });
    },
    handleAdd: function () {
        if (this.props.beforeColumnAdd)
            this.props.beforeColumnAdd()
    },
    handleRemove: function (columnDefToRemove) {
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
    },
    handleToggleHide: function (summaryRow) {
        var sectorKey = generateSectorKey(summaryRow.sectorPath);
        if (this.state.collapsedSectorPaths[sectorKey] == null)
            this.state.collapsedSectorPaths[sectorKey] = summaryRow.sectorPath;
        else
            delete this.state.collapsedSectorPaths[sectorKey];
        this.setState({
            collapsedSectorPaths: this.state.collapsedSectorPaths
        });
    },
    render: function () {
        var unhiddenRows = [];
        for (var i = 0; i < this.state.data.length; i++) {
            var row = this.state.data[i];
            if (!shouldHide(row, this.state.collapsedSectorPaths))
                unhiddenRows.push(row);
        }
        var rows = unhiddenRows.map(function (row) {
            return Row({data: row, key: generateRowKey(row), onSelectCallback: this.props.onSelectCallback, columnDefs: this.state.columnDefs, toggleHide: this.handleToggleHide});
        }, this);
        var headers = buildHeaders(this);
        return (
            React.DOM.table({className: "table table-condensed"}, 
                headers, 
                React.DOM.tbody(null, 
                    rows
                )
            )
        );
    }
});

var Row = React.createClass({displayName: 'Row',
    getInitialState: function () {
        return {
            isSelected: this.props.data.isSelected
        }
    },
    handleClick: function () {
        var isSelected = !this.state.isSelected;
        if (this.props.onSelectCallback)
            this.props.onSelectCallback.call(this, this.props.data);
        this.setState({
            isSelected: isSelected
        });
    },
    render: function () {
        var cells = [buildFirstCell(this.props)];
        for (var i = 1; i < this.props.columnDefs.length; i++) {
            var columnDef = this.props.columnDefs[i];
            var style = {"text-align": (columnDef.format == 'number') ? "right" : "left"};
            cells.push(React.DOM.td({style: style, key: columnDef.colTag + "=" + this.props.data[columnDef.colTag]}, this.props.data[columnDef.colTag]));
        }
        var styles = {
            "cursor": this.props.data.isDetail ? "pointer" : "inherit",
            "background-color": this.state.isSelected && this.props.data.isDetail ? "#999999" : "inherit",
            "color": this.state.isSelected && this.props.data.isDetail ? "#ffffff" : "inherit"
        };
        return (React.DOM.tr({onClick: this.handleClick, style: styles}, cells));
    }
});

/* Virtual DOM Builder helpers */

function buildHeaders(component) {
    var headerColumns = component.state.columnDefs.map(function (columnDef) {
        var styles = {
            "text-align": (columnDef.format == 'number') ? "right" : "left"
        };
        return (
            React.DOM.th({style: styles, key: columnDef.colTag}, 
                React.DOM.a({className: "btn-link", onClick: component.handleSort.bind(component, columnDef)}, columnDef.text), 
                React.DOM.a({className: "btn-link", onClick: component.handleRemove.bind(component, columnDef)}, 
                    React.DOM.span({className: "pull-right glyphicon glyphicon-remove"})
                )
            )
        );
    });
    headerColumns.push(React.DOM.th({style: {"text-align": "center"}}, 
        React.DOM.a({onClick: component.handleAdd}, 
            React.DOM.span({className: "glyphicon glyphicon-plus"})
        )
    ))
    return (
        React.DOM.thead(null, 
            React.DOM.tr(null, headerColumns)
        )
    );
}

function buildFirstCell(props) {
    var data = props.data, columnDef = props.columnDefs[0], toggleHide = props.toggleHide;
    var result, firstColTag = columnDef.colTag;

    // if sectorPath is not availiable - return a normal cell
    if (!data.sectorPath)
        return React.DOM.td({key: data[firstColTag]}, data[firstColTag]);

    // styling & ident
    var identLevel = !data.isDetail ? (data.sectorPath.length - 1) : data.sectorPath.length;
    var firstCellStyle = {
        "padding-left": identLevel * 25 + "px", "border-right": "1px #ddd solid"
    };


    if (data.isDetail) {
        result = React.DOM.td({style: firstCellStyle, key: data[firstColTag]}, data[firstColTag]);
    } else {
        result =
            (
                React.DOM.td({style: firstCellStyle, key: data[firstColTag]}, 
                    React.DOM.a({onClick: toggleHide.bind(null, data), className: "btn-link"}, 
                        React.DOM.strong(null, data[firstColTag])
                    )
                )
            );
    }
    return result;
}

/* Sector tree render utilities */

function shouldHide(data, collapsedSectorPaths) {
    var result = false;
    var hasCollapsedAncestor = areAncestorsCollapsed(data.sectorPath, collapsedSectorPaths);
    var isSummaryRow = !data.isDetail;
    var immediateSectorCollapsed = (collapsedSectorPaths[generateSectorKey(data.sectorPath)] != null);
    if (hasCollapsedAncestor)
        result = true;
    else if (immediateSectorCollapsed && !isSummaryRow)
        result = true;
    return result;
}

/**
 * Compares sector path passed to all collapsed sectors to determine if one of the collapsed sectors is the given sector's ancestor
 * @param sectorPath [array] the sectorPath to perform comparison on
 * @param collapsedSectorPaths a map (object) where properties are string representation of the sectorPath considered to be collapsed
 * @returns {boolean}
 */
function areAncestorsCollapsed(sectorPath, collapsedSectorPaths) {
    var result = false;
    // true if sectorPaths is a subsector of the collapsedSectorPaths
    for (var sectorPathKey in collapsedSectorPaths) {
        if (collapsedSectorPaths.hasOwnProperty(sectorPathKey) && isSubSectorOf(sectorPath, collapsedSectorPaths[sectorPathKey]))
            result = true;
    }
    return result;
}

function isSubSectorOf(subSectorCandidate, superSectorCandidate) {
    // lower length in SP means higher up on the chain
    if (subSectorCandidate.length <= superSectorCandidate.length)
        return false;
    for (var i = 0; i < superSectorCandidate.length; i++) {
        if (subSectorCandidate[i] != superSectorCandidate[i])
            return false;
    }
    return true;
}

/* Other utility functions */

// @heavyUtil
function generateRowKey(row) {
    // row key = sectorPath + values of the row
    var key = generateSectorKey(row.sectorPath);
    for (var prop in row) {
        if (row.hasOwnProperty(prop)) {
            key += prop + "=" + row[prop] + ";";
        }
    }
    return key;
}

function generateSectorKey(sectorPath) {
    if (!sectorPath)
        return "";
    return sectorPath.join(SECTOR_SEPARATOR);
}

function prepareTableData(props) {
    var data = props.data;
    if (props.groupBy)
        data = groupData(props.data, props.groupBy, props.columnDefs);
    var sortOptions = {sectorSorter: defaultSectorSorter, detailSorter: defaultDetailSorter};
    data.sort(sorterFactory.call(this, sortOptions));
    return data;
}
