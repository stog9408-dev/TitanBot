#!/bin/bash

# 🚀 TitanBot GitHub Update Script
# This script helps automate the process of committing and pushing changes to GitHub

set -e

echo "🤖 TitanBot GitHub Update Script"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed. Please install git first.${NC}"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not a git repository. Please run this script from the TitanBot directory.${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Checking repository status...${NC}"
echo ""

# Show current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${GREEN}Current branch: ${CURRENT_BRANCH}${NC}"
echo ""

# Show status
git status --short

echo ""
echo -e "${YELLOW}📝 What would you like to do?${NC}"
echo "1) Stage all changes and commit"
echo "2) Stage specific files"
echo "3) View detailed status"
echo "4) Push to GitHub"
echo "5) Full update (stage, commit, push)"
echo "6) Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo -e "${BLUE}📦 Staging all changes...${NC}"
        git add .
        echo ""
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
        echo -e "${GREEN}✅ Changes committed successfully!${NC}"
        ;;
    2)
        echo -e "${BLUE}📦 Enter files to stage (space-separated):${NC}"
        read -p "Files: " files
        git add $files
        echo ""
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
        echo -e "${GREEN}✅ Changes committed successfully!${NC}"
        ;;
    3)
        echo -e "${BLUE}📊 Detailed status:${NC}"
        git status
        ;;
    4)
        echo -e "${BLUE}🚀 Pushing to GitHub...${NC}"
        git push origin $CURRENT_BRANCH
        echo -e "${GREEN}✅ Pushed to GitHub successfully!${NC}"
        ;;
    5)
        echo -e "${BLUE}📦 Staging all changes...${NC}"
        git add .
        echo ""
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
        echo ""
        echo -e "${BLUE}🚀 Pushing to GitHub...${NC}"
        git push origin $CURRENT_BRANCH
        echo ""
        echo -e "${GREEN}✅ Full update completed successfully!${NC}"
        ;;
    6)
        echo -e "${YELLOW}👋 Exiting...${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✨ Done!${NC}"

# Made with Bob
