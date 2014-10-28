/** @jsx React.DOM */
var SECTOR_SEPARATOR = "#";
var Row = React.createClass({displayName: 'Row',
    render: function () {
        // styling & identation
        var tdStyle = {padding: (this.props.data.sectorPath.length) * 10 + "px;"};

        var cells = [];
        var firstCell;
        if (this.props.data.isDetail) {
            firstCell = React.DOM.td({style: tdStyle, key: this.props.data.col1}, this.props.data.col1);
        } else {
            firstCell =
                (
                    React.DOM.td({style: tdStyle, key: this.props.data.col1}, 
                        React.DOM.a({onClick: this.props.toggleHide.bind(null, this.props.data), className: "btn-link"}, 
                            React.DOM.strong(null, this.props.data.col1)
                        )
                    )
                );
        }
        cells.push(firstCell);
        cells.push(React.DOM.td({key: this.props.data.col2}, this.props.data.col2));

        return (React.DOM.tr(null, cells));
    }
});
var Table = React.createClass({displayName: 'Table',
    getInitialState: function () {
        return {
            collapsedSectorPaths: {}
        };
    },
    handleToggleHide: function (summaryRow) {
        var sectorKey = generateSectorKey(summaryRow.sectorPath);
        if (this.state.collapsedSectorPaths[sectorKey] == null) {
            // hide
            this.state.collapsedSectorPaths[sectorKey] = summaryRow.sectorPath;
        } else {
            // unhide
            delete this.state.collapsedSectorPaths[sectorKey];
        }
        this.setState({
            collapsedSectorPaths: this.state.collapsedSectorPaths
        });
    },
    render: function () {
        var unhiddenRows = [];
        // create a array for hidden rows
        for (var i = 0; i < this.props.data.length; i++) {
            var data = this.props.data[i];
            if (!shouldHide(data, this.state.collapsedSectorPaths))
                unhiddenRows.push(data);
        }
        // only show unhidden rows
        var rows = unhiddenRows.map(function (row) {
            return Row({data: row, key: generateRowKey(row), toggleHide: this.handleToggleHide});
        }, this);

        return (
            React.DOM.table({className: "table table-bordered table-condensed"}, 
                React.DOM.thead(null, 
                    React.DOM.tr(null, 
                        React.DOM.td(null, 
                            React.DOM.strong(null, "col1")
                        ), 
                        React.DOM.td(null, 
                            React.DOM.strong(null, "col2")
                        )
                    )
                ), 
                React.DOM.tbody(null, 
                rows
                )
            )
        );
    }
});

/* Utility Functions */
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
function shouldHide(data, collapsedSectorPaths) {
    var hasCollapsedAncestor = areAncestorsCollapsed(data.sectorPath, collapsedSectorPaths);
    var isSummaryRow = !data.isDetail;
    var immediateSectorCollapsed = (collapsedSectorPaths[generateSectorKey(data.sectorPath)] == null);
    if (hasCollapsedAncestor)
        return true;
    if (immediateSectorCollapsed && !isSummaryRow)
        return true;
    return false;
}
function generateRowKey(row) {
    // row key = sectorPath + values of the row
    var key = generateSectorKey(row.sectorPath);
    key += row.col1; // TODO generate a real key
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
function generateSectorKey(sectorPath) {
    return sectorPath.join(SECTOR_SEPARATOR);
}
