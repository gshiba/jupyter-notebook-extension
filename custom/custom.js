define([
    "base/js/namespace",
    "notebook/js/cell",
    "codemirror/lib/codemirror",
    "codemirror/keymap/vim",
    "codemirror/addon/dialog/dialog",
    "codemirror/addon/display/rulers",
    'codemirror/addon/edit/trailingspace'
], function(
    Jupyter,
    Cell,
    CodeMirror
) {
    "use_strict";

    function leave_current_mode(cm) {
        console.log(cm.state.vim);
        if (cm.state.vim.insertMode) {
            CodeMirror.keyMap["vim-insert"].call("Esc", cm);
        } else if (cm.state.vim.visualMode) {
            CodeMirror.keyMap["vim"].call("Esc", cm);
        } else {
            Jupyter.notebook.command_mode();
            Jupyter.notebook.focus_cell();
        }
    };

    function select_cell_below(cm) {
        Jupyter.notebook.select_next();
        Jupyter.notebook.edit_mode();
    };

    function select_cell_above(cm) {
        Jupyter.notebook.select_prev();
        Jupyter.notebook.edit_mode();
    };

    function showRelativeLines(cm) {
        const lineNum = cm.getCursor().line + 1;
        if (cm.state.curLineNum === lineNum) {
            return;
        }
        cm.state.curLineNum = lineNum;
        cm.setOption('lineNumberFormatter', l =>
            l === lineNum ? (lineNum + (lineNum<10 ? " " : "") + "\u279C") : Math.abs(lineNum - l)
        );
    };

    CodeMirror.Vim.map("jk", "<Esc>", "insert");

    var ruler = {
        color: "#C8C8C8",
        column: 80,
        lineStyle: "dotted"
    };

    var cm_default = Cell.Cell.options_default.cm_config;
    cm_default.keyMap = "vim";
    cm_default.vimMode = true;
    cm_default.rulers = [ruler];
    cm_default.showTrailingSpace = true;

    function update_cm_instance_to_defaults(cell) {
        var cm = cell.code_mirror;
        cm.setOption("vimMode", true);
        cm.setOption("keyMap", "vim");
        cm.setOption("rulers", [ruler]);
        cm.setOption('showTrailingSpace', true);
        cm.setOption("extraKeys",
            {
                // https://github.com/jupyterlab/jupyterlab/blob/156a569cae094edebfbd7a4a7a18aeccbeec1705/packages/codemirror/src/factory.ts#L24-L25
                'Ctrl-/': 'toggleComment',
                'Esc': leave_current_mode,
                'Ctrl-K': select_cell_above,
                'Ctrl-J': select_cell_below
            });
        cm.on('cursorActivity', showRelativeLines);
        };
    Jupyter.notebook.get_cells().map(update_cm_instance_to_defaults);

    function openDialog_keymap_wrapper(target, template, callback, options) {
        Jupyter.keyboard_manager.disable();
        return target.call(this, template, callback, options);
    };
    CodeMirror.defineExtension("openDialog", _.wrap(CodeMirror.prototype.openDialog, openDialog_keymap_wrapper));

    // Jupyter front end hooks can be found by searchcing the [notebook
    // repo](github.comjupyter/notebook) for "events.trigger".
    // Reference: https://github.com/jupyter/notebook/issues/2321#issuecomment-288365064
    Jupyter.notebook.events.on('create.Cell', function(evt, data) {
        data.cell.code_mirror.on('cursorActivity', showRelativeLines);
    });

});
