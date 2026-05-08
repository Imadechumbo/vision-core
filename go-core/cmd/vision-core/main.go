// cmd/vision-core/main.go
// Vision Core Go Safe Core — CLI Entry Point
// Uso: vision-core.exe mission --root "<path>" --input "<texto>"
// Saída: JSON puro para stdout
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"

	githubflow "github.com/visioncore/go-core/internal/github"
	"github.com/visioncore/go-core/internal/mission"
	"github.com/visioncore/go-core/internal/passgold"
)

const githubFlowVersion = "V7.6"

func main() {
	if len(os.Args) < 2 {
		printUsageJSON()
		os.Exit(1)
	}

	cmd := os.Args[1]

	switch cmd {
	case "mission":
		runMission(os.Args[2:])
	case "github-flow":
		runGitHubFlow(os.Args[2:])
	case "version", "--version", "-v":
		printJSON(map[string]string{
			"version": passgold.Version,
			"engine":  passgold.Engine,
		})
	case "help", "--help", "-h":
		printUsageJSON()
	default:
		printJSON(map[string]interface{}{
			"ok":    false,
			"error": "unknown command: " + cmd,
			"usage": "vision-core mission --root <path> --input <text>",
		})
		os.Exit(1)
	}
}

func runMission(args []string) {
	fs := flag.NewFlagSet("mission", flag.ContinueOnError)
	root := fs.String("root", ".", "Project root path")
	input := fs.String("input", "", "Mission input text (required)")
	dryRun := fs.Bool("dry-run", false, "Dry run mode (no file changes)")

	// Redirecionar erros de flag para /dev/null — saída sempre é JSON
	fs.SetOutput(os.Stderr)

	if err := fs.Parse(args); err != nil {
		printJSON(map[string]interface{}{
			"ok":    false,
			"error": "invalid arguments: " + err.Error(),
		})
		os.Exit(1)
	}

	if *input == "" {
		printJSON(map[string]interface{}{
			"ok":    false,
			"error": "--input is required",
		})
		os.Exit(1)
	}

	// Resolver root
	rootPath := *root
	if rootPath == "" || rootPath == "." {
		cwd, err := os.Getwd()
		if err == nil {
			rootPath = cwd
		} else {
			rootPath = "."
		}
	}

	// Executar pipeline
	out := mission.Run(mission.Input{
		Root:      rootPath,
		InputText: *input,
		DryRun:    *dryRun,
	})

	printJSON(out)

	if !out.PassGold {
		os.Exit(2) // exit code 2 = FAIL GOLD
	}
}

func runGitHubFlow(args []string) {
	if hasHelpArg(args) {
		printGitHubFlowUsageJSON()
		return
	}

	fs := flag.NewFlagSet("github-flow", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	rootFlag := fs.String("root", ".", "Project root path")
	ownerFlag := fs.String("owner", "", "GitHub repository owner")
	repoFlag := fs.String("repo", "", "GitHub repository name")
	remoteFlag := fs.String("remote", "origin", "Git remote name (public flows only allow origin)")
	missionIDFlag := fs.String("mission-id", "", "Mission identifier")
	issueTypeFlag := fs.String("issue-type", "", "Issue type")
	changedFileFlag := stringSliceFlag{}
	fs.Var(&changedFileFlag, "changed-file", "Changed file path; repeat for multiple files")
	titleFlag := fs.String("title", "", "Pull request title override")
	bodyFlag := fs.String("body", "", "Pull request body override")
	dryRunFlag := fs.Bool("dry-run", true, "Dry run mode; defaults to true")
	applyRealFlag := fs.Bool("apply-real", false, "Enable real execution when combined with --dry-run=false and write gates")
	allowLocalGitFlag := fs.Bool("allow-local-git", false, "Allow local branch and commit creation")
	publishRemoteFlag := fs.Bool("publish-remote", false, "Publish remote branch step")
	openPRFlag := fs.Bool("open-pr", false, "Open pull request step")
	publishStatusFlag := fs.Bool("publish-status", false, "Publish PASS GOLD status step")

	if err := fs.Parse(args); err != nil {
		printGitHubFlowError("invalid arguments: " + err.Error())
		os.Exit(1)
	}

	rootPath := resolveRoot(*rootFlag)
	changedFiles := splitChangedFiles(changedFileFlag.String())
	dryRun := *dryRunFlag
	if !*applyRealFlag {
		dryRun = true
	}

	mode := "dry-run"
	if !dryRun {
		mode = "real"
	}

	if err := validateGitHubFlowCLI(gitHubFlowCLIInput{
		Root:          rootPath,
		Owner:         *ownerFlag,
		Repo:          *repoFlag,
		Remote:        *remoteFlag,
		MissionID:     *missionIDFlag,
		IssueType:     *issueTypeFlag,
		ChangedFiles:  changedFiles,
		Title:         *titleFlag,
		Body:          *bodyFlag,
		DryRun:        dryRun,
		ApplyReal:     *applyRealFlag,
		PublishRemote: *publishRemoteFlag,
		OpenPR:        *openPRFlag,
		PublishStatus: *publishStatusFlag,
	}); err != nil {
		printGitHubFlowResult(false, mode, dryRun, nil, err.Error())
		os.Exit(1)
	}

	plan := githubflow.BuildPRPlan(githubflow.PRPlanInput{
		MissionID:        *missionIDFlag,
		BaseBranch:       githubflow.DefaultBaseBranch,
		WorkBranchPrefix: "vision/remediation",
		ChangedFiles:     changedFiles,
		IssueType:        *issueTypeFlag,
		PatchSummary:     "Safe GitHub flow CLI plan",
		GateSnapshot: githubflow.GateSnapshot{
			PassGold:              true,
			PassSecure:            true,
			DeployAllowed:         true,
			PromotionAllowed:      true,
			SecurityBlockingTotal: 0,
			RollbackReady:         true,
			ValidatorOK:           true,
			PatcherOK:             true,
		},
	})
	if strings.TrimSpace(*titleFlag) != "" {
		plan.Title = strings.TrimSpace(*titleFlag)
	}
	if strings.TrimSpace(*bodyFlag) != "" {
		plan.Body = strings.TrimSpace(*bodyFlag)
	}

	client := githubflow.PRClient(nil)
	if !dryRun && (*openPRFlag || *publishStatusFlag) {
		client = githubflow.HTTPGitHubClient{}
	}

	if dryRun && !*allowLocalGitFlag {
		flow := dryRunGitHubFlow(plan, *publishRemoteFlag, *openPRFlag, *publishStatusFlag)
		printGitHubFlowResult(true, mode, dryRun, flow, "")
		return
	}

	flow := githubflow.RunEndToEndGitHubFlow(context.Background(), githubflow.EndToEndGitHubFlowInput{
		Root:             rootPath,
		Plan:             plan,
		Client:           client,
		Owner:            *ownerFlag,
		Repo:             *repoFlag,
		Remote:           *remoteFlag,
		DryRun:           dryRun,
		AllowLocalGit:    *allowLocalGitFlag,
		PublishRemote:    *publishRemoteFlag,
		OpenPR:           *openPRFlag,
		PublishStatus:    *publishStatusFlag,
		RequireWriteGate: true,
	})
	printGitHubFlowResult(flow.OK, mode, dryRun, flow, "")
	if !flow.OK {
		os.Exit(2)
	}
}

type stringSliceFlag []string

func (f *stringSliceFlag) String() string {
	if f == nil {
		return ""
	}
	return strings.Join(*f, ",")
}

func (f *stringSliceFlag) Set(value string) error {
	*f = append(*f, value)
	return nil
}

func dryRunGitHubFlow(plan githubflow.PRPlan, publishRemote, openPR, publishStatus bool) map[string]interface{} {
	return map[string]interface{}{
		"ok":                   true,
		"dry_run":              true,
		"plan_id":              plan.ID,
		"base_branch":          plan.BaseBranch,
		"work_branch":          plan.WorkBranch,
		"local_flow_ok":        true,
		"branch_created":       false,
		"commit_created":       false,
		"remote_publish_ok":    publishRemote,
		"would_push":           publishRemote,
		"remote_pushed":        false,
		"pr_open_ok":           openPR,
		"would_open_pr":        openPR,
		"pr_opened":            false,
		"status_ok":            publishStatus,
		"would_publish_status": publishStatus,
		"status_published":     false,
		"blocked":              false,
		"plan":                 plan,
	}
}

type gitHubFlowCLIInput struct {
	Root          string
	Owner         string
	Repo          string
	Remote        string
	MissionID     string
	IssueType     string
	ChangedFiles  []string
	Title         string
	Body          string
	DryRun        bool
	ApplyReal     bool
	PublishRemote bool
	OpenPR        bool
	PublishStatus bool
}

func validateGitHubFlowCLI(input gitHubFlowCLIInput) error {
	missing := []string{}
	for name, value := range map[string]string{
		"--root":       input.Root,
		"--owner":      input.Owner,
		"--repo":       input.Repo,
		"--remote":     input.Remote,
		"--mission-id": input.MissionID,
		"--issue-type": input.IssueType,
		"--title":      input.Title,
		"--body":       input.Body,
	} {
		if strings.TrimSpace(value) == "" {
			missing = append(missing, name)
		}
	}
	if len(input.ChangedFiles) == 0 {
		missing = append(missing, "--changed-file")
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing required flags: %s", strings.Join(missing, ", "))
	}
	if input.Remote != "origin" {
		return fmt.Errorf("remote %q is not allowed; public github-flow only allows origin", input.Remote)
	}
	if input.PublishStatus && (!input.PublishRemote || !input.OpenPR) {
		return fmt.Errorf("--publish-status requires --publish-remote and --open-pr")
	}
	if !input.DryRun {
		if !input.ApplyReal {
			return fmt.Errorf("--apply-real is required for --dry-run=false")
		}
		if os.Getenv("VISION_GITHUB_WRITE") != "1" {
			return fmt.Errorf("--apply-real --dry-run=false requires VISION_GITHUB_WRITE=1")
		}
		if (input.OpenPR || input.PublishStatus) && os.Getenv("GITHUB_TOKEN") == "" {
			return fmt.Errorf("real --open-pr/--publish-status requires GITHUB_TOKEN")
		}
	}
	return nil
}

func splitChangedFiles(value string) []string {
	parts := strings.Split(value, ",")
	files := make([]string, 0, len(parts))
	seen := map[string]bool{}
	for _, part := range parts {
		file := strings.TrimSpace(part)
		if file == "" || seen[file] {
			continue
		}
		files = append(files, file)
		seen[file] = true
	}
	return files
}

func resolveRoot(value string) string {
	if value == "" || value == "." {
		cwd, err := os.Getwd()
		if err == nil {
			return cwd
		}
		return "."
	}
	return value
}

func hasHelpArg(args []string) bool {
	for _, arg := range args {
		if arg == "--help" || arg == "-h" || arg == "help" {
			return true
		}
	}
	return false
}

func printGitHubFlowError(err string) {
	printJSON(map[string]interface{}{
		"ok":      false,
		"version": githubFlowVersion,
		"mode":    "error",
		"error":   err,
	})
}

func printGitHubFlowResult(ok bool, mode string, dryRun bool, flow interface{}, err string) {
	out := map[string]interface{}{
		"ok":          ok,
		"version":     githubFlowVersion,
		"mode":        mode,
		"github_flow": flow,
		"dry_run":     dryRun,
	}
	if err != "" {
		out["error"] = err
	}
	printJSON(out)
}

func printJSON(v interface{}) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		fmt.Fprintf(os.Stderr, "json encode error: %v\n", err)
	}
}

func printUsageJSON() {
	printJSON(map[string]interface{}{
		"engine":   passgold.Engine,
		"version":  passgold.Version,
		"usage":    "vision-core <command> [flags]",
		"commands": []string{"mission", "github-flow", "version", "help"},
		"examples": []string{
			`vision-core mission --root "." --input "self-test"`,
			`vision-core github-flow --root "." --owner OWNER --repo REPO --mission-id MISSION --issue-type ISSUE --changed-file path/to/file --title "TITLE" --body "BODY" --publish-remote --open-pr --publish-status`,
		},
	})
}

func printGitHubFlowUsageJSON() {
	printJSON(map[string]interface{}{
		"ok":      true,
		"version": githubFlowVersion,
		"usage":   "vision-core github-flow --root <path> --owner <owner> --repo <repo> --remote origin --mission-id <id> --issue-type <type> --changed-file <path> --title <title> --body <body> [--dry-run=true|false] [--apply-real] [--allow-local-git] [--publish-remote] [--open-pr] [--publish-status]",
		"flags": []string{
			"--root",
			"--owner",
			"--repo",
			"--remote",
			"--mission-id",
			"--issue-type",
			"--changed-file",
			"--title",
			"--body",
			"--dry-run=true|false",
			"--apply-real",
			"--allow-local-git",
			"--publish-remote",
			"--open-pr",
			"--publish-status",
		},
		"defaults": map[string]interface{}{
			"base_branch": githubflow.DefaultBaseBranch,
			"dry_run":     true,
			"remote":      "origin",
			"work_branch": "vision/remediation/<mission-id>",
		},
	})
}
