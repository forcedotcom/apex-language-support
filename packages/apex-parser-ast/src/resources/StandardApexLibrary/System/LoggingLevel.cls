/**
 * Specifies the logging level for the System.debug method.
 * Enum Values
 * The following are the values of the System.LoggingLevel enum, listed from the lowest to the highest levels. The level is cumulative, that is, if you select FINE, the log also includes all events logged at the DEBUG, INFO, WARN, and ERROR levels.
 * Usage
 * Log levels are cumulative. For example, if the lowest level, ERROR, is specified for Apex code, only System.debug methods with the log level of ERROR are logged. If the next log level, WARN, is specified, System.debug methods specified with either ERROR or WARN levels are logged.
 * In this example, if the log level is set to ERROR, the string MsgTxt isn’t written to the debug log because the debug method has a level of INFO.
 * System.debug(logginglevel.INFO, 'MsgTxt');
 * For more information on log levels, see <a class="xref" href="https://help.salesforce.com/s/articleView?id=sf.code_setting_debug_log_levels.htm&amp;language=en_US" target="_blank">Debug Log Levels</a> in Salesforce Help.
 */
global enum LoggingLevel {
    DEBUG,
    ERROR,
    FINE,
    FINER,
    FINEST,
    INFO,
    INTERNAL,
    NONE,
    WARN

}