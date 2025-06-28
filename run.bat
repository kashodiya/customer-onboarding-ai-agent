@echo off

rem Check if PASS environment variable is set
if not defined PASS (
    echo The PASS environment variable is not set.
    echo Please set the PASS environment variable and try again.
    goto end
)

rem Run the uvicorn command
uvicorn main:app --reload

:end