package github

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
)

type PRClient interface {
	OpenPR(ctx context.Context, req OpenPRRequest) (OpenPRResponse, error)
	PublishStatus(ctx context.Context, req StatusRequest) error
}

type OpenPRRequest struct {
	Owner      string
	Repo       string
	BaseBranch string
	HeadBranch string
	Title      string
	Body       string
}

type OpenPRResponse struct {
	Number int
	URL    string
}

type StatusRequest struct {
	Owner       string
	Repo        string
	SHA         string
	State       string
	Context     string
	Description string
	TargetURL   string
}

type MockPRClient struct {
	OpenCalls   int
	StatusCalls int
}

func (m *MockPRClient) OpenPR(_ context.Context, req OpenPRRequest) (OpenPRResponse, error) {
	m.OpenCalls++
	return OpenPRResponse{Number: 1, URL: fmt.Sprintf("https://github.com/%s/%s/pull/1", req.Owner, req.Repo)}, nil
}

func (m *MockPRClient) PublishStatus(_ context.Context, _ StatusRequest) error {
	m.StatusCalls++
	return nil
}

type HTTPGitHubClient struct {
	HTTPClient *http.Client
	APIBaseURL string
}

func (c HTTPGitHubClient) OpenPR(ctx context.Context, req OpenPRRequest) (OpenPRResponse, error) {
	if os.Getenv("VISION_GITHUB_WRITE") != "1" {
		return OpenPRResponse{}, errors.New("github write disabled: set VISION_GITHUB_WRITE=1 to open a real PR")
	}
	if os.Getenv("GITHUB_TOKEN") == "" {
		return OpenPRResponse{}, errors.New("github token unavailable")
	}
	payload := map[string]string{"base": req.BaseBranch, "head": req.HeadBranch, "title": req.Title, "body": req.Body}
	var resp struct {
		Number  int    `json:"number"`
		HTMLURL string `json:"html_url"`
	}
	if err := c.do(ctx, "POST", fmt.Sprintf("/repos/%s/%s/pulls", req.Owner, req.Repo), payload, &resp); err != nil {
		return OpenPRResponse{}, err
	}
	return OpenPRResponse{Number: resp.Number, URL: resp.HTMLURL}, nil
}

func (c HTTPGitHubClient) PublishStatus(ctx context.Context, req StatusRequest) error {
	if os.Getenv("VISION_GITHUB_WRITE") != "1" {
		return errors.New("github write disabled: set VISION_GITHUB_WRITE=1 to publish a real status")
	}
	if os.Getenv("GITHUB_TOKEN") == "" {
		return errors.New("github token unavailable")
	}
	payload := map[string]string{"state": req.State, "context": req.Context, "description": req.Description, "target_url": req.TargetURL}
	return c.do(ctx, "POST", fmt.Sprintf("/repos/%s/%s/statuses/%s", req.Owner, req.Repo, req.SHA), payload, nil)
}

func (c HTTPGitHubClient) do(ctx context.Context, method, path string, payload any, out any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	base := c.APIBaseURL
	if base == "" {
		base = "https://api.github.com"
	}
	req, err := http.NewRequestWithContext(ctx, method, base+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+os.Getenv("GITHUB_TOKEN"))
	client := c.HTTPClient
	if client == nil {
		client = http.DefaultClient
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("github api request failed with status %d", resp.StatusCode)
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

type OpenFlowInput struct {
	DryRun  bool
	Plan    PRPlan
	Client  PRClient
	Request OpenPRRequest
	Status  StatusRequest
}

func OpenPRDryRunAware(ctx context.Context, input OpenFlowInput) PRResult {
	res := PRResult{OK: input.Plan.CanOpenPR, PlanID: input.Plan.ID}
	if !input.Plan.CanOpenPR {
		res.Error = input.Plan.BlockReason
		return res
	}
	if input.DryRun {
		return res
	}
	if os.Getenv("VISION_GITHUB_WRITE") != "1" {
		res.OK = false
		res.Error = "github write disabled: set VISION_GITHUB_WRITE=1"
		return res
	}
	if input.Client == nil {
		res.OK = false
		res.Error = "pr client is required"
		return res
	}
	pr, err := input.Client.OpenPR(ctx, input.Request)
	if err != nil {
		res.OK = false
		res.Error = err.Error()
		return res
	}
	res.PROpened = true
	res.PRNumber = pr.Number
	res.PRURL = pr.URL
	if err := input.Client.PublishStatus(ctx, input.Status); err != nil {
		res.OK = false
		res.Error = err.Error()
		return res
	}
	res.StatusPublished = true
	return res
}
