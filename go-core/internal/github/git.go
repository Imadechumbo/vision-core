package github

import (
	"bytes"
	"errors"
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
)

var deniedPathPrefixes = []string{".vision-memory", ".vision-snapshots", "bin", "node_modules", "vendor", "dist", "build", ".next"}

func CurrentBranch(root string) (string, error) {
	return gitOutput(root, "rev-parse", "--abbrev-ref", "HEAD")
}

func EnsureCleanWorkingTree(root string) error {
	out, err := gitOutput(root, "status", "--porcelain")
	if err != nil {
		return err
	}
	if strings.TrimSpace(out) != "" {
		return errors.New("working tree is not clean")
	}
	return nil
}

func EnsureWorkingTreeOnlyHas(root string, files []string) error {
	allowed := map[string]bool{}
	for _, f := range files {
		clean, err := validateGitPath(root, f)
		if err != nil {
			return err
		}
		allowed[clean] = true
	}
	out, err := gitOutput(root, "status", "--porcelain")
	if err != nil {
		return err
	}
	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		path := strings.TrimSpace(line[3:])
		if strings.Contains(path, " -> ") {
			parts := strings.Split(path, " -> ")
			path = parts[len(parts)-1]
		}
		path = filepath.ToSlash(path)
		if !allowed[path] {
			return fmt.Errorf("working tree contains unplanned change: %s", path)
		}
	}
	return nil
}

func CreateBranch(root, branch string) error {
	if !IsSafeBranchName(branch) {
		return fmt.Errorf("unsafe branch name: %q", branch)
	}
	_, err := gitOutput(root, "checkout", "-b", branch)
	return err
}

func AddFiles(root string, files []string) error {
	if len(files) == 0 {
		return errors.New("no files planned for git add")
	}
	args := []string{"add", "--"}
	for _, f := range files {
		clean, err := validateGitPath(root, f)
		if err != nil {
			return err
		}
		args = append(args, clean)
	}
	_, err := gitOutput(root, args...)
	return err
}

func Commit(root, message string) (string, error) {
	if strings.TrimSpace(message) == "" {
		return "", errors.New("commit message is required")
	}
	staged, err := gitOutput(root, "diff", "--cached", "--name-only")
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(staged) == "" {
		return "", errors.New("no files staged for commit")
	}
	if _, err := gitOutput(root, "commit", "-m", message); err != nil {
		return "", err
	}
	return GetHeadSHA(root)
}

func GetHeadSHA(root string) (string, error) {
	return gitOutput(root, "rev-parse", "HEAD")
}

func validateGitPath(root, p string) (string, error) {
	if strings.TrimSpace(p) == "" {
		return "", errors.New("empty git path")
	}
	p = filepath.ToSlash(strings.TrimSpace(p))
	if filepath.IsAbs(p) || strings.HasPrefix(p, "../") || strings.Contains(p, "/../") || p == ".." {
		return "", fmt.Errorf("path outside root is not allowed: %s", p)
	}
	clean := filepath.ToSlash(filepath.Clean(p))
	if clean == "." || strings.HasPrefix(clean, "../") || clean == ".." {
		return "", fmt.Errorf("path outside root is not allowed: %s", p)
	}
	for _, denied := range deniedPathPrefixes {
		if clean == denied || strings.HasPrefix(clean, denied+"/") {
			return "", fmt.Errorf("path is excluded from git automation: %s", clean)
		}
	}
	rootAbs, err := filepath.Abs(root)
	if err != nil {
		return "", err
	}
	pathAbs, err := filepath.Abs(filepath.Join(root, clean))
	if err != nil {
		return "", err
	}
	rel, err := filepath.Rel(rootAbs, pathAbs)
	if err != nil || strings.HasPrefix(filepath.ToSlash(rel), "../") || rel == ".." {
		return "", fmt.Errorf("path outside root is not allowed: %s", p)
	}
	return clean, nil
}

func gitOutput(root string, args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = root
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		return "", errors.New(msg)
	}
	return strings.TrimSpace(stdout.String()), nil
}
