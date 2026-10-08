"use client";

import { startTransition, type FormEvent } from "react";

// React resets a <form action={...}> after every submission, which would
// wipe what the user typed when the server sends back a validation error.
// Submitting through onSubmit keeps the fields; forms reset on success only.
export function submitWith(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}
