import { NextResponse } from 'next/server';
import { SlashCommandBuilder } from '@discordjs/builders';
import {
  DescribeInstancesCommand,
  StopInstancesCommand,
} from '@aws-sdk/client-ec2';
import {
  type APIApplicationCommandInteraction,
  InteractionResponseType,
} from 'discord-api-types/v10';

import { ec2Client } from '@/libs';
import { Command } from '@/types';

const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop Terraria Vanilla Server');

const execute = async (interaction: APIApplicationCommandInteraction) => {
  // check if user has permission to run this command
  if (!interaction.member?.roles?.includes(process.env.DISCORD_ROLE_ID!)) {
    return NextResponse.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: 'You do not have permission to run this command' },
      ephermeral: true,
    });
  }

  let instanceId: string;
  let instanceIp: string;

  const describeInstancesCommand = new DescribeInstancesCommand({
    Filters: [
      {
        Name: 'tag:Name',
        Values: ['terraria-vanilla'],
      },
    ],
  });

  try {
    const { Reservations } = await ec2Client.send(describeInstancesCommand);

    if (!Reservations) {
      return NextResponse.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: 'No reservations found' },
      });
    }

    if (!Reservations[0]?.Instances) {
      return NextResponse.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: 'No instances found' },
      });
    }

    if (
      Reservations[0].Instances[0]?.State?.Code !== 16 ||
      Reservations[0].Instances[0]?.State?.Name === 'stopping' ||
      Reservations[0].Instances[0]?.State?.Name === 'stopped'
    ) {
      return NextResponse.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Terraria Vanilla Server is already stopped',
        },
      });
    }

    instanceId = Reservations[0].Instances[0]?.InstanceId as string;
    instanceIp = Reservations[0].Instances[0]?.PublicIpAddress as string;
  } catch (error) {
    return NextResponse.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { content: (error as any).message },
    });
  }

  console.log(`http://${instanceIp}:8080/stop`);

  try {
    const response = await fetch(
      `http://${instanceIp}:8080/stop`,
      {
        cache: 'no-cache',
        headers: {
          'x-api-key': process.env.TERRARIA_SERVER_API_KEY!,
        },
        method: 'GET'
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Failed to stop Terraria Vanilla Server: ${response.statusText}`,
        },
      });
    }
  } catch (error) {
    return NextResponse.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { content: (error as any).message },
    });
  }

  const stopInstancesCommand = new StopInstancesCommand({
    InstanceIds: [instanceId],
  });

  try {
    const { StoppingInstances } = await ec2Client.send(stopInstancesCommand);

    if (!StoppingInstances) {
      return NextResponse.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: 'No instances found' },
      });
    }

    if (!StoppingInstances[0]?.CurrentState) {
      return NextResponse.json({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: 'No current state found' },
      });
    }
  } catch (error) {
    return NextResponse.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { content: (error as any).message },
    });
  }

  return NextResponse.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content: 'Stopped Terraria Vanilla Server' },
  });
};

export default {
  data,
  execute,
} as Command;
