import Runner from './main.js';
/**
 * Control and populate the sidebar.
 */

export default class Controller {

    /**
     * Link the Controller sidebar to the simulation.
     * @param {Object} parameters A parameters object so we can make a sidebar
     *                             and generate a runner.
     */
    constructor(parameters) {
        this.parameters = parameters;
        this.makeSidebar();
        $("html").keypress(this.handleKeyPress);
        $("input[type=text]").on("input change paste", this.validateChars);
        new Runner(parameters);
    }

    handleKeyPress(event) {
        if (event.keyCode === 32) {
            if ($("#sidebar").offset().left >= $("html").width()) {
                $("#sidebar").animate({
                    right: 0
                }, 500);
            }
            else {
                $("#sidebar").animate({
                    right: -400
                }, 500);
            }
        }
    }

    validateChars(event) {
        let newValue = $(this).val().replace(/[^0-9\.]/g, '');
        $(this).val(newValue);
    }

    makeSidebar() {
        // Title
        $("#sidebar-inner").html("<h1>Settings</h1>");

        // Submission button
        $("#sidebar-inner").append(
            "<input id='submit' value='Update & Restart' type='submit'/>");
        $("#submit").click(this.onSubmit.bind(this));

        // Generate settings
        let table = $("<table></table>");
        for (let category in this.parameters) {

            // Generate section title.
            let title = $("<tr></tr>");
            let titleCell = $("<td colspan='2'></td>");
            $(titleCell).append("<h2>// " + category + "</h2>");
            $(titleCell).append("<p class='tip'>" + this.parameters[category]["doc"] + "</p>");
            titleCell.appendTo(title);
            title.appendTo(table);

            for (let setting in this.parameters[category]) {

                // Generate each setting.
                if (setting != 'doc') {
                    let row = $("<tr></tr>");
                    let description = $("<td class='description'></td>");

                    $(description).append("<li class='setting'>" + setting + "</li>");
                    $(description).append("<p class='tip'>" + this.parameters[category][setting]["doc"] + "</p>");
                    row.append(description);
                    
                    $(row).append("<td class='data'><input id='" + 
                                    category + "-" + setting +
                                    "' type='text' value='" + 
                                    this.parameters[category][setting]["data"] + "'/></td>");
                    row.appendTo(table);
                }
            }
        }
        $("#sidebar-inner").append(table);
    }

    onSubmit() {
        let self = this;
        $("input[type=text]").each((index, element) => {
            let categorySetting = element.id.split("-");
            self.parameters[categorySetting[0]][categorySetting[1]]["data"] = element.value;
        });
        new Runner(this.parameters);
    }

 }