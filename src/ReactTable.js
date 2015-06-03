/** @jsx React.DOM */

/**
 * The core data is represented as a multi-node tree structure, where each node on the tree represents a 'sector'
 * and can refer to children 'sectors'
 * @author Erfang Chen
 */
var idCounter = 0;
var SECTOR_SEPARATOR = "#";

var ReactTable = React.createClass({

    getInitialState: ReactTableGetInitialState,

    /* --- Called by component or child react components --- */
    handleSort: ReactTableHandleSort,
    handleAddSort: ReactTableHandleAddSort,
    handleColumnFilter: ReactTableHandleColumnFilter,
    handleAdd: ReactTableHandleAdd,
    handleRemove: ReactTableHandleRemove,
    handleToggleHide: ReactTableHandleToggleHide,
    handleGroupBy: ReactTableHandleGroupBy,
    handlePageClick: ReactTableHandlePageClick,
    handleSelect: ReactTableHandleSelect,
    handleCollapseAll: function () {
        var rootNode = this.state.rootNode;
        rootNode.collapseImmediateChildren();
        this.setState({rootNode: rootNode, currentPage: 1});
    },
    handleExpandAll: function () {
        var rootNode = this.state.rootNode;
        rootNode.expandRecursively();
        this.setState({rootNode: rootNode, currentPage: 1});
    },
    handleDownload: function (type) {
        var reactTableData = this;

        var objToExport = {headers: [], data: []};

        var firstColumn = this.state.columnDefs[0];

        var rasterizedData = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: firstColumn,
            selectedDetailRows: this.state.selectedDetailRows
        });

        $.each(this.props.columnDefs, function () {
            objToExport.headers.push(this.text);
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
            exportToExcel(objToExport, this.props.filenameToSaveAs ? this.props.filenameToSaveAs : "table-export");
        else if (type === "pdf")
            exportToPDF(objToExport, this.props.filenameToSaveAs ? this.props.filenameToSaveAs : "table-export");
    },
    /* -------------------------------------------------- */

    toggleSelectDetailRow: function (key) {
        var selectedDetailRows = this.state.selectedDetailRows, state;
        if (selectedDetailRows[key] != null) {
            delete selectedDetailRows[key];
            state = false;
        }
        else {
            selectedDetailRows[key] = 1;
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
    addColumn: function (columnDef, data) {
        // Update if exists
        var updated = false;
        for (var i = 0; i < this.state.columnDefs.length; i++) {
            if (this.state.columnDefs[i].colTag == columnDef.colTag) {
                this.state.columnDefs[i] = columnDef;
                updated = true;
                break;
            }
        }
        if (!updated)
            this.state.columnDefs.push(columnDef);
        if (data) {
            this.props.data = data;
            this.state.rootNode = createTree(this.props);
        } else
            recursivelyAggregateNodes(this.state.rootNode, this.props);
        this.setState({rootNode: this.state.rootNode});
    },
    redoPresort: function () {
        if (this.props.presort) {
            var colDefToSort;
            for (var colTag in this.props.presort) {
                for (var i = 0; i < this.props.columnDefs.length; i++) {
                    if (this.props.columnDefs[i].colTag === colTag) {
                        colDefToSort = this.props.columnDefs[i];
                        if (this.props.presort[colTag] === 'asc')
                            this.handleSort(colDefToSort, true);
                        else if (this.props.presort[colTag] === 'desc')
                            this.handleSort(colDefToSort, false);
                        break;
                    }
                }
            }
        }
    },
    replaceData: function (data, stopPresort) {
        this.props.data = data;
        var rootNode = createTree(this.props);
        this.setState({
            rootNode: rootNode,
            currentPage: 1,
            sortAsc: undefined,
            columnDefSorted: undefined,
            filterInPlace: {}
        });
        this.props.currentSortStates = [];
        var table = this;
        if (!stopPresort) {
            setTimeout(function () {
                table.redoPresort();
            });
        }
    },
    setStyleByKey: function (key, style) {
        this.state.extraStyle[key] = style;
        this.setState({
            extraStyle: this.state.extraStyle
        });
    },
    handleScroll: function (e) {
        var target = $(e.target);
        var scrolled = target.scrollTop();
        var scrolledHeight = target.height();
        var totalHeight = target.find("tbody").height();
        if (scrolled / (totalHeight - scrolledHeight) > .8) {
            this.setState({
                rows: this.addMoreRows(true)
            });
        }
    },
    /* ----------------------------------------- */

    componentDidMount: function () {
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
            $node.find(".rt-headers").css({'overflow': 'auto'}).scrollLeft($(this).scrollLeft());
            $node.find(".rt-headers").css({'overflow': 'hidden'});
        });
        bindHeadersToMenu($node);
        var table = this;
        setTimeout(function () {
            table.redoPresort();
        });
    },
    componentWillMount: function () {
    },
    componentWillUnmount: function () {
        window.removeEventListener('resize', adjustHeaders.bind(this));
        $(this.getDOMNode()).find(".rt-scrollable").get(0).removeEventListener('scroll', this.handleScroll);
    },
    componentDidUpdate: function () {
        adjustHeaders.call(this);
        bindHeadersToMenu($(this.getDOMNode()));
    },
    addMoreRows: function (calledFromScroll) {
        if (this.props.justAdded) {
            this.props.justAdded = false;
            return this.state.rows;
        }
        var rasterizedData = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: this.state.columnDefs[0],
            selectedDetailRows: this.state.selectedDetailRows
        });

        if (!calledFromScroll)
            this.props.rowMultiplier = this.props.rowMultiplier ? this.props.rowMultiplier : 0;
        else
            this.props.rowMultiplier = (this.props.rowMultiplier === undefined ? 0 : this.props.rowMultiplier + 1);

        var upperBound = (this.props.rowMultiplier + 1) * this.state.itemsPerScroll;
        var rowsToDisplay = [];

        if (calledFromScroll && this.state.rows.length < upperBound && this.state.rows.length < rasterizedData.length) {
            var lowerBound = this.state.rows.length;
            rowsToDisplay = rasterizedData.slice(lowerBound, upperBound);
            this.props.justAdded = true;
            return this.state.rows.concat(rowsToDisplay.map(rowMapper, this))
        }
        else {
            rowsToDisplay = rasterizedData.slice(0, upperBound);
            return rowsToDisplay.map(rowMapper, this)
        }
    },
    render: function () {
        var rasterizedData = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: this.state.columnDefs[0],
            selectedDetailRows: this.state.selectedDetailRows
        });

        var paginationAttr = _getPageArithmetics(this, rasterizedData);

        if (this.props.disableInfiniteScrolling) {
            var rowsToDisplay = rasterizedData.slice(paginationAttr.lowerVisualBound, paginationAttr.upperVisualBound + 1);
            this.state.rows = rowsToDisplay.map(rowMapper, this);
        }
        else
            this.state.rows = this.addMoreRows();

        var headers = buildHeaders(this);
        var footer = buildFooter(this, paginationAttr);

        var containerStyle = {};
        if (this.state.height && parseInt(this.state.height) > 0)
            containerStyle.height = this.state.height;

        if (this.props.disableScrolling)
            containerStyle.overflowY = "hidden";

        return (
            <div id={this.state.uniqueId} className="rt-table-container">
                {headers}
                <div style={containerStyle} className="rt-scrollable">
                    <InfiniteScroll
                        loadMore={this.addMoreRows}
                        hasMore={this.state.hasMore}>
                        <table className="rt-table">
                            <tbody>
                            {this.state.rows}
                            </tbody>
                        </table>
                    </InfiniteScroll>
                </div>
                {this.props.disableInfiniteScrolling ? footer : null}
            </div>
        );
    }
});

/**
 * Represents a row in the table, built from cells
 */
var Row = React.createClass({
    render: function () {
        var cells = [buildFirstCellForRow(this.props)];
        for (var i = 1; i < this.props.columnDefs.length; i++) {
            var columnDef = this.props.columnDefs[i];
            var displayInstructions = buildCellLookAndFeel(columnDef, this.props.data);
            var cx = React.addons.classSet;
            var classes = cx(displayInstructions.classes);
            var displayContent = displayInstructions.value;

            // convert and format dates
            if (columnDef && columnDef.format && columnDef.format.toLowerCase() === "date") {
                if (!isNaN(displayContent)) // if displayContent is a number, we assume displayContent is in milliseconds
                    displayContent = new Date(displayContent).toLocaleDateString();
            }
            // determine cell content, based on whether a cell templating callback was provided
            if (columnDef.cellTemplate)
                displayContent = columnDef.cellTemplate.call(this, this.props.data, columnDef, displayContent);
            cells.push(
                <td
                    className={classes}
                    onClick={columnDef.onCellSelect ? columnDef.onCellSelect.bind(this, this.props.data[columnDef.colTag], columnDef, i) : null}
                    onContextMenu={this.props.onRightClick ? this.props.onRightClick.bind(null, this.props.data, columnDef) : null}
                    style={displayInstructions.styles}
                    key={columnDef.colTag}>
                    {displayContent}
                </td>
            );
        }
        var cx = React.addons.classSet;
        var classes = cx({
            'selected': this.props.isSelected && this.props.data.isDetail,
            'summary-selected': this.props.isSelected && !this.props.data.isDetail
        });
        var styles = {
            "cursor": "pointer"
        };
        for (var attrname in this.props.extraStyle) {
            styles[attrname] = this.props.extraStyle[attrname];
        }
        return (<tr onClick={this.props.onSelect.bind(null, this.props.data)}
                    className={classes} style={styles}>{cells}</tr>);
    }
});

var PageNavigator = React.createClass({
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
                <li key={item} className={self.props.activeItem == item ? 'active' : ''}>
                    <a onClick={self.handleClick.bind(null, item)}>{item}</a>
                </li>
            )
        });
        return (
            <ul className={prevClass} className="pagination pull-right">
                <li className={nextClass}>
                    <a className={prevClass}
                       onClick={this.props.handleClick.bind(null, this.props.activeItem - 1)}>&laquo;</a>
                </li>
                {items}
                <li className={nextClass}>
                    <a className={nextClass}
                       onClick={this.props.handleClick.bind(null, this.props.activeItem + 1)}>&raquo;</a>
                </li>
            </ul>
        );
    }
});

var SummarizeControl = React.createClass({
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
            this.props.table.handleGroupBy(this.props.columnDef, this.state.userInputBuckets);
        }
    },
    handleClick: function (event) {
        var $node = $(this.getDOMNode());
        $node.children(".menu-item-input").children("input").focus();
    },
    render: function () {
        var table = this.props.table, columnDef = this.props.columnDef;
        var subMenuAttachment = columnDef.format == "number" || columnDef.format == "currency" ?
            (
                <div className="menu-item-input" style={{"position": "absolute", "top": "-50%", "right": "100%"}}>
                    <label style={{"display": "block"}}>Enter Bucket(s)</label>
                    <input tabIndex="1" onKeyPress={this.handleKeyPress} onChange={this.handleChange}
                           placeholder="ex: 1,10,15"/>
                    <a tabIndex="2" style={{"display": "block"}}
                       onClick={table.handleGroupBy.bind(null, columnDef, this.state.userInputBuckets)}
                       className="btn-link">Ok</a>
                </div>
            ) : null;
        return (
            <div
                onClick={subMenuAttachment == null ? table.handleGroupBy.bind(null, columnDef, null) : this.handleClick}
                style={{"position": "relative"}} className="menu-item menu-item-hoverable">
                <div>Summarize</div>
                {subMenuAttachment}
            </div>
        );
    }
});

/*
 * ----------------------------------------------------------------------
 * Public Helpers / Utilities
 * ----------------------------------------------------------------------
 */

function generateSectorKey(sectorPath) {
    if (sectorPath == null)
        return "";
    return sectorPath.join(SECTOR_SEPARATOR);
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
    return (<Row
        key={generatedKey}
        data={row}
        extraStyle={_getExtraStyle(generatedKey, this.state.extraStyle)}
        isSelected={_isRowSelected(row, this.props.rowKey, this.state.selectedDetailRows, this.state.selectedSummaryRows)}
        onSelect={this.handleSelect}
        onRightClick={this.props.onRightClick}
        toggleHide={this.handleToggleHide}
        columnDefs={this.state.columnDefs}
        />);
}

function docClick(e) {
    adjustHeaders.call(this);
    // Remove filter-in-place boxes if they are open and they weren't clicked on
    if (!jQuery.isEmptyObject(this.state.filterInPlace)) {
        if (!($(e.target).hasClass("rt-header-element") || $(e.target).parent().hasClass("rt-header-element"))) {
            this.setState({
                filterInPlace: {}
            });
        }
    }
}

function adjustHeaders(adjustCount) {
    var id = this.state.uniqueId;
    if (!(adjustCount >= 0))
        adjustCount = 0;
    var counter = 0;
    var headerElems = $("#" + id + " .rt-headers-container");
    var padding = parseInt(headerElems.first().find(".rt-header-element").css("padding-left"));
    padding += parseInt(headerElems.first().find(".rt-header-element").css("padding-right"));
    var adjustedSomething = false;

    headerElems.each(function () {
        var currentHeader = $(this);
        var width = $('#' + id + ' .rt-table tr:last td:eq(' + counter + ')').outerWidth() - 1;
        if (counter == 0 && parseInt(headerElems.first().css("border-right")) == 1) {
            width += 1;
        }
        var headerTextWidthWithPadding = currentHeader.find(".rt-header-anchor-text").width() + padding;
        if (currentHeader.width() > 0 && headerTextWidthWithPadding > currentHeader.width() + 1) {
            currentHeader.css("width", headerTextWidthWithPadding + "px");
            $("#" + id).find("tr").find("td:eq(" + counter + ")").css("min-width", (headerTextWidthWithPadding) + "px");
            adjustedSomething = true;
        }
        if (width !== currentHeader.width()) {
            currentHeader.width(width);
            adjustedSomething = true;
        }
        counter++;
    });

    if (!adjustedSomething)
        return;

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
};

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _isRowSelected(row, rowKey, selectedDetailRows, selectedSummaryRows) {
    if (rowKey == null)
        return;
    return selectedDetailRows[row[rowKey]] != null || (!row.isDetail && selectedSummaryRows[generateSectorKey(row.sectorPath)] != null);
}

function _getExtraStyle(geenratedKey, extraStyles) {
    return geenratedKey && extraStyles ? extraStyles[geenratedKey] : null;
}

function _getPageArithmetics(table, data) {
    var result = {};

    if (table.props.disablePagination) {
        result.lowerVisualBound = 0, result.upperVisualBound = data.length
    } else {
        result.pageSize = table.props.pageSize || 50;
        result.maxDisplayedPages = table.props.maxDisplayedPages || 10;

        result.pageStart = 1;
        result.pageEnd = Math.ceil(data.length / result.pageSize);

        result.allPages = [];
        for (var i = result.pageStart; i <= result.pageEnd; i++) {
            result.allPages.push(i);
        }
        // derive the correct page navigator selectable pages from current / total pages
        result.pageDisplayRange = _computePageDisplayRange(table.state.currentPage, result.maxDisplayedPages);

        result.lowerVisualBound = (table.state.currentPage - 1) * result.pageSize;
        result.upperVisualBound = Math.min(table.state.currentPage * result.pageSize - 1, data.length);
    }

    return result;

}

function _computePageDisplayRange(currentPage, maxDisplayedPages) {
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
