global class SearchResult {
    global Object SearchResult() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global List getMatches() { return null; }

    global Slack.SearchResult.Pagination getPagination() { return null; }

    global Slack.Paging getPaging() { return null; }

    global List getRefinements() { return null; }

    global Integer getTotal() { return 0; }

    global virtual Integer hashCode() { return 0; }

    global void setMatches(List matches) { }

    global void setPagination(Slack.SearchResult.Pagination pagination) { }

    global void setPaging(Slack.Paging paging) { }

    global void setRefinements(List refinements) { }

    global void setTotal(Integer total) { }

    global override String toString() { return null; }

    global class Pagination {
        global Object Pagination() { return null; }

        global Slack.SearchResult.Pagination clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global Integer getFirst() { return 0; }

        global Integer getLast() { return 0; }

        global Integer getPage() { return 0; }

        global Integer getPageCount() { return 0; }

        global Integer getPerPage() { return 0; }

        global Integer getTotalCount() { return 0; }

        global virtual Integer hashCode() { return 0; }

        global void setFirst(Integer first) { }

        global void setLast(Integer last) { }

        global void setPage(Integer page) { }

        global void setPageCount(Integer pageCount) { }

        global void setPerPage(Integer perPage) { }

        global void setTotalCount(Integer totalCount) { }

        global override virtual String toString() { return null; }
    }
}