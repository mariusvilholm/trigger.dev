import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useNavigation, useTransition } from "@remix-run/react";
import { TypedMetaFunction, typedjson, useTypedLoaderData } from "remix-typedjson";
import { z } from "zod";
import { LogoIcon } from "~/components/LogoIcon";
import { AppContainer, MainCenteredContainer } from "~/components/layout/AppLayout";
import { Button, LinkButton } from "~/components/primitives/Buttons";
import { Fieldset } from "~/components/primitives/Fieldset";
import { FormButtons } from "~/components/primitives/FormButtons";
import { FormTitle } from "~/components/primitives/FormTitle";
import { Input } from "~/components/primitives/Input";
import { InputGroup } from "~/components/primitives/InputGroup";
import { Label } from "~/components/primitives/Label";
import { NamedIcon } from "~/components/primitives/NamedIcon";
import { Paragraph } from "~/components/primitives/Paragraph";
import { authenticator } from "~/services/auth.server";
import { commitSession, getUserSession } from "~/services/sessionStorage.server";
import magicLinkIcon from "./login.magic.svg";
import type { LoaderType as RootLoader } from "~/root";
import { appEnvTitleTag } from "~/utils";
import { TextLink } from "~/components/primitives/TextLink";
import { FormError } from "~/components/primitives/FormError";
import { LoginPageLayout } from "~/components/LoginPageLayout";
import { Header1 } from "~/components/primitives/Headers";

export const meta: TypedMetaFunction<typeof loader, { root: RootLoader }> = ({ parentsData }) => ({
  title: `Login to Trigger.dev${appEnvTitleTag(parentsData?.root.appEnv)}`,
});

export async function loader({ request }: LoaderArgs) {
  await authenticator.isAuthenticated(request, {
    successRedirect: "/",
  });

  const session = await getUserSession(request);
  const error = session.get("auth:error");

  let magicLinkError: string | undefined;
  if (error) {
    if ("message" in error) {
      magicLinkError = error.message;
    } else {
      magicLinkError = JSON.stringify(error, null, 2);
    }
  }

  return typedjson(
    {
      magicLinkSent: session.has("triggerdotdev:magiclink"),
      magicLinkError,
    },
    {
      headers: { "Set-Cookie": await commitSession(session) },
    }
  );
}

export async function action({ request }: ActionArgs) {
  const clonedRequest = request.clone();

  const payload = Object.fromEntries(await clonedRequest.formData());

  const { action } = z
    .object({
      action: z.enum(["send", "reset"]),
    })
    .parse(payload);

  if (action === "send") {
    return authenticator.authenticate("email-link", request, {
      successRedirect: "/login/magic",
      failureRedirect: "/login/magic",
    });
  } else {
    const session = await getUserSession(request);
    session.unset("triggerdotdev:magiclink");

    return redirect("/login/magic", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
}

export default function LoginMagicLinkPage() {
  const { magicLinkSent, magicLinkError } = useTypedLoaderData<typeof loader>();
  const navigate = useNavigation();

  const isLoading =
    (navigate.state === "loading" || navigate.state === "submitting") &&
    navigate.formAction !== undefined &&
    navigate.formData?.get("action") === "send";

  return (
    <LoginPageLayout>
      <Form method="post">
        <div className="flex flex-col items-center justify-center">
          {magicLinkSent ? (
            <>
              <FormTitle divide={false} title="We've sent you a magic link!" />
              <Fieldset className="flex w-full flex-col items-center gap-y-2">
                <Paragraph className="mb-6 text-center">
                  We sent you an email which contains a magic link that will log you in to your
                  account.
                </Paragraph>
                <FormButtons
                  cancelButton={
                    <Button
                      type="submit"
                      name="action"
                      value="reset"
                      variant="tertiary/small"
                      LeadingIcon="arrow-left"
                      leadingIconClassName="text-dimmed group-hover:text-bright transition"
                      data-action="re-enter email"
                    >
                      Re-enter email
                    </Button>
                  }
                  confirmButton={
                    <LinkButton
                      to="/login"
                      variant="tertiary/small"
                      data-action="log in using another option"
                    >
                      Log in using another option
                    </LinkButton>
                  }
                />
              </Fieldset>
            </>
          ) : (
            <>
              <Header1 className="pb-4 font-normal sm:text-2xl md:text-3xl lg:text-4xl">
                Welcome
              </Header1>
              <Paragraph variant="base" className="mb-6">
                Create an account or login using email
              </Paragraph>
              <Fieldset className="flex w-full flex-col items-center gap-y-2">
                <InputGroup>
                  <Input
                    type="email"
                    name="email"
                    spellCheck={false}
                    placeholder="Email Address"
                    variant="large"
                    required
                    autoFocus
                  />
                </InputGroup>

                <Button
                  name="action"
                  value="send"
                  type="submit"
                  variant="primary/large"
                  disabled={isLoading}
                  fullWidth
                  data-action="send a magic link"
                >
                  <NamedIcon
                    name={isLoading ? "spinner-white" : "envelope"}
                    className={"mr-1.5 h-4 w-4 text-white transition group-hover:text-bright"}
                  />
                  {isLoading ? "Sending…" : "Send a magic link"}
                </Button>
                {magicLinkError && <FormError>{magicLinkError}</FormError>}
              </Fieldset>
              <Paragraph variant="extra-small" className="my-4 text-center">
                By logging in with your email you agree to our{" "}
                <TextLink href="https://trigger.dev/legal" target="_blank">
                  terms
                </TextLink>{" "}
                and{" "}
                <TextLink href="https://trigger.dev/legal/privacy" target="_blank">
                  privacy
                </TextLink>{" "}
                policy.
              </Paragraph>

              <LinkButton
                to="/login"
                variant={"tertiary/small"}
                LeadingIcon={"arrow-left"}
                leadingIconClassName="text-dimmed group-hover:text-bright transition"
                data-action="all login options"
              >
                All login options
              </LinkButton>
            </>
          )}
        </div>
      </Form>
    </LoginPageLayout>
  );
}
