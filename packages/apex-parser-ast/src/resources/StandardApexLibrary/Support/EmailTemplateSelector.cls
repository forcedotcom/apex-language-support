/**
 * The Support.EmailTemplateSelector interface enables providing default email templates in Case Feed. With default email templates, specified email templates are preloaded for cases based on criteria such as case origin or subject.
 */
global interface EmailTemplateSelector {
    virtual Boolean equals(Object arg0);

    abstract Id getDefaultEmailTemplateId(Id caseId);

    virtual Integer hashCode();

    virtual String toString();
}