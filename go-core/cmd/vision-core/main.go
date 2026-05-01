// cmd/vision-core/main.go
// Vision Core Go Safe Core — CLI Entry Point
// Uso: vision-core.exe mission --root "<path>" --input "<texto>"
// Saída: JSON puro para stdout
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"github.com/visioncore/go-core/internal/mission"
	"github.com/visioncore/go-core/internal/passgold"
)

func main() {
	if len(os.Args) < 2 {
		printUsageJSON()
		os.Exit(1)
	}

	cmd := os.Args[1]

	switch cmd {
	case "mission":
		runMission(os.Args[2:])
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
	root  := fs.String("root", ".", "Project root path")
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

func printJSON(v interface{}) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		fmt.Fprintf(os.Stderr, "json encode error: %v\n", err)
	}
}

func printUsageJSON() {
	printJSON(map[string]interface{}{
		"engine":  passgold.Engine,
		"version": passgold.Version,
		"usage":   "vision-core mission --root <path> --input <text>",
		"commands": []string{"mission", "version", "help"},
		"example": `vision-core mission --root "." --input "self-test"`,
	})
}
